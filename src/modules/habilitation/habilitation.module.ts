import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';

import { CommuneActuelleMiddleware } from '@/lib/class/middlewares/commune_actuelle.middleware';
import { ApiAnnuaireModule } from '@/modules/api_annuaire/api_annuaire.module';
import { ClientModule } from '@/modules/client/client.module';
import { Habilitation } from './habilitation.entity';
import { HabilitationService } from './habilitation.service';
import { HabilitationController } from './habilitation.controller';
import { HabilitationMiddleware } from './habilitation.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProConnectStrategy } from './pro_connect/pro_connect.strategy';
import {
  ProConnectAuthGuard,
  ProConnectCallBackGuard,
} from './pro_connect/pro_connect.guard';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([Habilitation]),
    ApiAnnuaireModule,
    PassportModule.register({ session: true }),
    ClientModule,
  ],
  providers: [
    HabilitationService,
    ProConnectStrategy,
    ProConnectAuthGuard,
    ProConnectCallBackGuard,
  ],
  controllers: [HabilitationController],
  exports: [HabilitationService],
})
export class HabilitationModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HabilitationMiddleware)
      .exclude({
        path: 'communes/:codeCommune/habilitations',
        method: RequestMethod.ALL,
      })
      .forRoutes(HabilitationController);

    consumer.apply(CommuneActuelleMiddleware).forRoutes({
      path: 'communes/:codeCommune/habilitations',
      method: RequestMethod.ALL,
    });
  }
}
