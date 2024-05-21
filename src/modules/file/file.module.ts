import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';
import { File, FileSchema } from './file.schema';
import { FileService } from './file.service';
import { S3Service } from './s3.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
  ],
  providers: [FileService, S3Service],
  exports: [FileService, S3Service],
})
export class FileModule {}
