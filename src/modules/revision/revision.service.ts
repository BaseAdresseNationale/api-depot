import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  FilterQuery,
  Model,
  PipelineStage,
  QueryWithHelpers,
  Types,
} from 'mongoose';
import { pick } from 'lodash';

import { isCommune } from '@/lib/utils/cog';
import { PublicClient } from '@/modules/client/dto/public_client.dto';
import { ClientService } from '@/modules/client/client.service';
import { FileService } from '@/modules/file/file.service';
import { File } from '@/modules/file/file.schema';
import { BanService } from '@/modules/ban/ban.service';
import {
  AuthorizationStrategyEnum,
  Client,
} from '@/modules/client/client.schema';
import { HabilitationService } from '@/modules/habilitation/habilitation.service';
import { StatusHabilitationEnum } from '@/modules/habilitation/habilitation.schema';
import { RevisionWithClientDTO } from './dto/revision_with_client.dto';
import { ValidationService } from './validation.service';
import { NotifyService } from './notify.service';
import {
  Context,
  Revision,
  StatusRevisionEnum,
  Validation,
} from './revision.schema';

@Injectable()
export class RevisionService {
  constructor(
    @InjectModel(Revision.name)
    private revisionModel: Model<Revision>,
    private clientService: ClientService,
    private habilitationService: HabilitationService,
    private fileService: FileService,
    private validationService: ValidationService,
    private banService: BanService,
    private notifyService: NotifyService,
  ) {}

  async findMany(
    filter?: FilterQuery<Revision>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<Revision[]> {
    const query: QueryWithHelpers<
      Array<Revision>,
      Revision
    > = this.revisionModel.find(filter);

    if (selector) {
      query.select(selector);
    }
    if (limit) {
      query.limit(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    return query.lean().exec();
  }

  public async findCurrents(publishedSince: Date | null = null) {
    const publishedSinceQuery = publishedSince
      ? { publishedAt: { $gt: publishedSince } }
      : {};

    const revisions: Revision[] = await this.revisionModel
      .find(
        { current: true, ...publishedSinceQuery },
        { _id: 1, codeCommune: 1, publishedAt: 1, client: 1 },
      )
      .lean()
      .exec();

    return revisions.filter((r) => isCommune(r.codeCommune));
  }

  public async findCurrent(codeCommune: string): Promise<Revision> {
    const revision = await this.revisionModel
      .findOne({ current: true, codeCommune })
      .lean()
      .exec();

    if (!revision) {
      throw new HttpException(
        `Aucune revision trouvé pour la commune ${codeCommune}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return revision;
  }

  public async findOne(filter): Promise<Revision> {
    return await this.revisionModel.findOne(filter).lean().exec();
  }

  public async findOneOrFail(revisionId: string): Promise<Revision> {
    const revision = await this.revisionModel
      .findOne({ _id: revisionId })
      .lean()
      .exec();

    if (!revision) {
      throw new HttpException(
        `Revision ${revisionId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return revision;
  }

  public async createOne(
    codeCommune: string,
    client: Client,
    context: Context,
  ): Promise<Revision> {
    const revision = await this.revisionModel.create({
      codeCommune,
      context,
      client: client._id,
      status: StatusRevisionEnum.PENDING,
      ready: false,
      publishedAt: null,
    });
    return revision.toObject();
  }

  public async expandWithClient(
    revision: Revision,
    withFile: boolean = false,
  ): Promise<RevisionWithClientDTO> {
    const client: PublicClient = await this.clientService.findPublicClient(
      revision.client,
    );

    const file: File =
      withFile && (await this.fileService.findOneByRevision(revision._id));

    return {
      ...revision,
      client,
      file,
    };
  }

  public async expandsWithClients(
    revisions: Revision[],
  ): Promise<RevisionWithClientDTO[]> {
    const clients: PublicClient[] =
      await this.clientService.findAllPublicClients();
    return revisions.map((r: Revision) => ({
      ...r,
      client: clients.find(
        ({ _id }) => r.client.toHexString() === _id.toHexString(),
      ),
    }));
  }

  public async setFile(revision: Revision, fileData: Buffer): Promise<File> {
    if (revision.status !== StatusRevisionEnum.PENDING) {
      throw new HttpException(
        'La révision n’est plus modifiable',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const currentFile: File = await this.fileService.findOneByRevision(
      revision._id,
    );

    if (currentFile) {
      throw new HttpException(
        'Fichier déjà attaché a la révision',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const file: File = await this.fileService.createOne(revision._id, fileData);
    this.touch(revision._id);

    return file;
  }

  public async touch(revisionId: string | Types.ObjectId): Promise<Revision> {
    const revision: Revision = await this.revisionModel.findOneAndUpdate(
      { _id: revisionId },
      { $set: { updatedAt: new Date() } },
      { returnDocument: 'after' },
    );

    return revision;
  }

  public async computeOne(
    revision: Revision,
    client: Client,
  ): Promise<Revision> {
    if (revision.status !== StatusRevisionEnum.PENDING) {
      throw new HttpException(
        'La révision n’est plus modifiable',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const fileData: Buffer = await this.fileService.findDataByRevision(
      revision._id,
    );

    const validation: Validation = await this.validationService.validate(
      fileData,
      revision.codeCommune,
      client,
    );

    return this.revisionModel
      .findOneAndUpdate(
        { _id: revision._id },
        {
          $set: {
            updatedAt: new Date(),
            validation,
            ready: Boolean(validation.valid),
          },
        },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
  }

  public async publishOne(
    revision: Revision,
    client: Client,
    habilitationId: string | null = null,
  ): Promise<Revision> {
    if (revision.status !== StatusRevisionEnum.PENDING || !revision.ready) {
      throw new HttpException(
        'La publication n’est pas possible',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const now = new Date();
    const changes: Partial<Revision> = {
      publishedAt: now,
      updatedAt: now,
      ready: null,
      status: StatusRevisionEnum.PUBLISHED,
      current: true,
    };

    if (
      client.authorizationStrategy === AuthorizationStrategyEnum.HABILITATION
    ) {
      if (habilitationId) {
        const habilitation = await this.habilitationService.findOne({
          _id: habilitationId,
          codeCommune: revision.codeCommune,
          client: client._id,
          status: StatusHabilitationEnum.ACCEPTED,
        });

        if (!habilitation) {
          throw new HttpException(
            `L’habilitation ${habilitationId} n’est pas valide`,
            HttpStatus.NOT_FOUND,
          );
        }

        changes.habilitation = pick(habilitation, [
          '_id',
          'emailCommune',
          'codeCommune',
          'createdAt',
          'updatedAt',
          'expiresAt',
          'strategy',
        ]);
      } else {
        throw new HttpException(
          `Le client ${client.nom} nécessite une habilitation pour publier`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    let prevRevision = null;
    try {
      prevRevision = await this.findCurrent(revision.codeCommune);
    } catch {}

    // On supprime le flag current pour toutes les anciennes révisions publiées de cette commune
    await this.revisionModel.updateMany(
      {
        codeCommune: revision.codeCommune,
        current: true,
      },
      { $set: { current: false } },
    );

    // On publie la révision
    const revisionPublished: Revision = await this.revisionModel
      .findOneAndUpdate(
        { _id: revision._id },
        { $set: changes },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    // On invalide toutes les révisions en attente pour cette commune
    await this.revisionModel.updateMany(
      {
        codeCommune: revision.codeCommune,
        status: StatusRevisionEnum.PENDING,
        _id: { $ne: revision._id },
      },
      { $set: { ready: false } },
    );

    if (process.env.NOTIFY_BAN === '1') {
      this.banService.composeCommune(revision.codeCommune);
    }

    // On notifie les partenaires si une commune qui était gérée par un partenaire
    // force une publication via mes-adresses
    this.notifyService.onForcePublish(prevRevision, revisionPublished);

    return revisionPublished;
  }

  async aggregate(pipeline?: PipelineStage[]): Promise<any> {
    return this.revisionModel.aggregate(pipeline);
  }
}
