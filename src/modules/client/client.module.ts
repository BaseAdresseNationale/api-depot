import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MandataireModule } from '@/modules/mandataire/mandataire.module';
import { ChefDeFileModule } from '@/modules/chef_de_file/chef_de_file.module';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ClientMiddleware } from './client.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './client.entity';
import { BalAdminModule } from '../bal_admin/bal_admin.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Client]),
    MandataireModule,
    ChefDeFileModule,
    BalAdminModule,
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
