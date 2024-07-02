import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { ChefDeFile, ChefDeFileSchema } from './chef_de_file.schema';
import { ChefDeFileService } from './chef_de_file.service';
import { ChefDeFileController } from './chef_de_file.controller';
import { ChefDeFileMiddleware } from './chef_de_file.middleware';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: ChefDeFile.name, schema: ChefDeFileSchema },
    ]),
  ],
  providers: [ChefDeFileService],
  controllers: [ChefDeFileController],
  exports: [ChefDeFileService],
})
export class ChefDeFileModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ChefDeFileMiddleware).forRoutes(ChefDeFileController);
  }
}
