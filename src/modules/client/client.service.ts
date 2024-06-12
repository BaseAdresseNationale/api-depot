import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, QueryWithHelpers, Types } from 'mongoose';
import { omit } from 'lodash';

import { generateToken } from '@/lib/utils/token.utils';
import { MandataireService } from '@/modules/mandataire/mandataire.service';
import { ChefDeFileService } from '@/modules/chef_de_file/chef_de_file.service';
import { formatEmail as createNewClientEmail } from '@/modules/mailer/templates/new-client.template';
import { formatEmail as createRenewTokenEmail } from '@/modules/mailer/templates/renew-token.template';
import { AuthorizationStrategyEnum, Client } from './client.schema';
import { PublicClient } from './dto/public_client.dto';
import { ChefDeFile } from '../chef_de_file/chef_de_file.schema';
import { Mandataire } from '../mandataire/mandataire.schema';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel(Client.name)
    private clientModel: Model<Client>,
    private mandataireService: MandataireService,
    private chefDeFileService: ChefDeFileService,
    private mailerService: MailerService,
  ) {}

  async findMany(
    filter?: FilterQuery<Client>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<Client[]> {
    const query: QueryWithHelpers<
      Array<Client>,
      Client
    > = this.clientModel.find(filter);

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

  public async findOne(filter): Promise<Client> {
    return await this.clientModel.findOne(filter).lean().exec();
  }

  public async findOneOrFail(
    clientId: string | Types.ObjectId,
  ): Promise<Client> {
    const client = await this.clientModel
      .findOne({ _id: clientId })
      .lean()
      .exec();

    if (!client) {
      throw new HttpException(
        `Client ${clientId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return client;
  }

  public async createOne(body: Partial<Client>): Promise<Client> {
    let chefDeFile: ChefDeFile;
    if (body.chefDeFile) {
      chefDeFile = await this.chefDeFileService.findOneOrFail(body.chefDeFile);
    }

    const mandataire: Mandataire = await this.mandataireService.findOneOrFail(
      body.mandataire,
    );

    const client: Client = await this.clientModel.create({
      ...body,
      token: generateToken(),
      authorizationStrategy: body.chefDeFile
        ? AuthorizationStrategyEnum.CHEF_DE_FILE
        : AuthorizationStrategyEnum.HABILITATION,
    });

    // Send token to user with mandataire’s email
    const email = createNewClientEmail({ client, mandataire, chefDeFile });
    await this.mailerService.sendMail(email, [mandataire.email]);

    return client;
  }

  public async updateOne(
    clientId: string,
    changes: Partial<Client>,
  ): Promise<Client> {
    if (changes.chefDeFile) {
      await this.chefDeFileService.findOneOrFail(changes.chefDeFile);
    }
    if (changes.mandataire) {
      await this.mandataireService.findOneOrFail(changes.mandataire);
    }

    const client: Client = await this.clientModel.findOneAndUpdate(
      { _id: clientId },
      { $set: changes },
      { returnDocument: 'after' },
    );

    return client;
  }

  public async renewToken(clientId: Types.ObjectId): Promise<Client> {
    const client: Client = await this.clientModel.findOneAndUpdate(
      { _id: clientId },
      { $set: { token: generateToken() } },
      { returnDocument: 'after' },
    );
    const mandataire = await this.mandataireService.findOneOrFail(
      client.mandataire,
    );

    const email = createRenewTokenEmail({ client });
    await this.mailerService.sendMail(email, [mandataire.email]);

    return client;
  }

  public filterSensitiveFields(client: Client): Omit<Client, 'token'> {
    return omit(client, 'token');
  }

  public async findAllPublicClients(): Promise<PublicClient[]> {
    const clients = await this.clientModel
      .find({}, { _id: 1, id: 1, nom: 1, chefDeFile: 1, mandataire: 1 })
      .lean()
      .exec();

    const mandataires: Mandataire[] = await this.mandataireService.findMany({});
    const chefDeFiles: ChefDeFile[] = await this.chefDeFileService.findMany({});

    return clients.map((client: Client) => {
      const publicClient: PublicClient = {
        _id: client._id,
        id: client.id,
        nom: client.nom,
        mandataire:
          mandataires.find(
            ({ _id }) => _id.toHexString() === client.mandataire.toHexString(),
          )?.nom || null,
      };
      if (client.chefDeFile) {
        const chefDeFile = chefDeFiles.find(
          ({ _id }) => client.chefDeFile.toHexString() === _id.toHexString(),
        );
        publicClient.chefDeFile = chefDeFile.nom;
        if (chefDeFile.isEmailPublic) {
          publicClient.chefDeFileEmail = chefDeFile.email;
        }
      }
      return publicClient;
    });
  }

  public async findPublicClient(
    clientId: Types.ObjectId,
  ): Promise<PublicClient> {
    const client = await this.clientModel
      .findOne(
        { _id: clientId },
        { _id: 1, id: 1, nom: 1, chefDeFile: 1, mandataire: 1 },
      )
      .lean()
      .exec();

    if (!client) {
      throw new HttpException(
        `Client ${clientId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const mandataire = await this.mandataireService.findOneOrFail(
      client.mandataire,
    );
    const publicClient: PublicClient = {
      _id: client._id,
      id: client.id,
      nom: client.nom,
      mandataire: mandataire.nom,
    };

    if (client.chefDeFile) {
      const chefDeFile = await this.chefDeFileService.findOneOrFail(
        client.chefDeFile,
      );
      publicClient.chefDeFile = chefDeFile.nom;
      if (chefDeFile.isEmailPublic) {
        publicClient.chefDeFileEmail = chefDeFile.email;
      }
    }

    return publicClient;
  }
}
