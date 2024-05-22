import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, QueryWithHelpers, Types } from 'mongoose';
import { omit } from 'lodash';

import { MandataireService } from '@/modules/mandataire/mandataire.service';
import { ChefDeFileService } from '@/modules/chef_de_file/chef_de_file.service';
import { Client } from './client.schema';
import { PublicClient } from './dto/public_client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel(Client.name)
    private clientModel: Model<Client>,
    private mandataireService: MandataireService,
    private chefDeFileService: ChefDeFileService,
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
    return this.clientModel.create(body);
  }

  public async updateOne(
    clientId: string,
    changes: Partial<Client>,
  ): Promise<Client> {
    const client: Client = await this.clientModel.findOneAndUpdate(
      { _id: clientId },
      { $set: changes },
      { returnDocument: 'after' },
    );

    return client;
  }

  public filterSensitiveFields(client: Client): Omit<Client, 'token'> {
    return omit(client, 'token');
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
      const chefDeFile = await await this.chefDeFileService.findOneOrFail(
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
