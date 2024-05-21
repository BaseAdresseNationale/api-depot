import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';
import { Client, ClientSchema } from './client.schema';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ClientMiddleware } from './client.middleware';
import { MandataireModule } from '../mandataire/mandataire.module';
import { ChefDeFileModule } from '../chef_de_file/chef_de_file.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]),
    MandataireModule,
    ChefDeFileModule,
  ],
  providers: [ClientService],
  controllers: [ClientController],
  exports: [ClientService],
})
export class ClientModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClientMiddleware).forRoutes(ClientController);
  }
}
