import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, QueryWithHelpers, Types } from 'mongoose';

import { ChefDeFile } from './chef_de_file.schema';

@Injectable()
export class ChefDeFileService {
  constructor(
    @InjectModel(ChefDeFile.name)
    private chefDeFileModel: Model<ChefDeFile>,
  ) {}

  async findMany(
    filter?: FilterQuery<ChefDeFile>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<ChefDeFile[]> {
    const query: QueryWithHelpers<
      Array<ChefDeFile>,
      ChefDeFile
    > = this.chefDeFileModel.find(filter);

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
    chefDeFileId: string | Types.ObjectId,
  ): Promise<ChefDeFile> {
    const chefDeFile = await this.chefDeFileModel
      .findOne({ _id: chefDeFileId })
      .lean()
      .exec();

    if (!chefDeFile) {
      throw new HttpException(
        `Chef de file ${chefDeFileId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return chefDeFile;
  }

  public async updateOne(
    chefDeFileId: string,
    changes: Partial<ChefDeFile>,
  ): Promise<ChefDeFile> {
    const chefDefile: ChefDeFile = await this.chefDeFileModel.findOneAndUpdate(
      { _id: chefDeFileId },
      { $set: changes },
      { upsert: true },
    );

    return chefDefile;
  }
}
