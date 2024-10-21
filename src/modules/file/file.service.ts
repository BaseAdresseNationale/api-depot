import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as hasha from 'hasha';

import { File, TypeFileEnum } from './file.schema';
import { S3Service } from './s3.service';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name)
    private fileModel: Model<File>,
    private s3Service: S3Service,
  ) {}

  public async createOne(revisionId: string, fileData: Buffer): Promise<File> {
    const now = Date.now();
    console.log(
      `START UPLOAD FILE S3 for ${revisionId}, size ${Buffer.byteLength(fileData)} at ${new Date(now).toDateString()}`,
    );
    const _id = await this.s3Service.writeFile(fileData);
    console.log(`END UPLOAD FILE S3 for ${revisionId} in ${Date.now() - now}`);
    const newfile: Partial<File> = {
      _id,
      revisionId: new Types.ObjectId(revisionId),
      type: TypeFileEnum.BAL,
      size: fileData.length,
      hash: hasha(fileData, { algorithm: 'sha256' }),
    };

    return this.fileModel.create(newfile);
  }

  public async findOneByRevision(
    revisionId: Types.ObjectId | string,
  ): Promise<File> {
    return await this.fileModel
      .findOne({ revisionId, type: TypeFileEnum.BAL })
      .lean()
      .exec();
  }

  public async findDataByRevision(revisionId: string): Promise<Buffer> {
    const file: File = await this.findOneByRevision(revisionId);

    if (!file) {
      throw new HttpException(
        'Aucun fichier de type `bal` associé à cette révision',
        HttpStatus.NOT_FOUND,
      );
    }

    const data: Buffer = await this.s3Service.getFile(file._id.toHexString());
    return Buffer.from(data);
  }
}
