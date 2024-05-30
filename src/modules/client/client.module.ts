import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { MandataireModule } from '@/modules/mandataire/mandataire.module';
import { ChefDeFileModule } from '@/modules/chef_de_file/chef_de_file.module';
import { Client, ClientSchema } from './client.schema';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ClientMiddleware } from './client.middleware';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]),
    MandataireModule,
    ChefDeFileModule,
    MailerModule,
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
