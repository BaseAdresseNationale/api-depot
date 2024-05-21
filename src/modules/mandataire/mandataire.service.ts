import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, QueryWithHelpers, Types } from 'mongoose';

import { Mandataire } from './mandataire.schema';

@Injectable()
export class MandataireService {
  constructor(
    @InjectModel(Mandataire.name)
    private mandataireModel: Model<Mandataire>,
  ) {}

  async findMany(
    filter?: FilterQuery<Mandataire>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<Mandataire[]> {
    const query: QueryWithHelpers<
      Array<Mandataire>,
      Mandataire
    > = this.mandataireModel.find(filter);

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

  public async findOneOrFail(
    mandataireId: string | Types.ObjectId,
  ): Promise<Mandataire> {
    const mandataire = await this.mandataireModel
      .findOne({ _id: mandataireId })
      .lean()
      .exec();

    if (!mandataire) {
      throw new HttpException(
        `Mandataire ${mandataireId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return mandataire;
  }

  public async updateOne(
    mandataireId: string,
    changes: Partial<Mandataire>,
  ): Promise<Mandataire> {
    const mandataire: Mandataire = await this.mandataireModel.findOneAndUpdate(
      { _id: mandataireId },
      { $set: changes },
      { upsert: true },
    );

    return mandataire;
  }
}
