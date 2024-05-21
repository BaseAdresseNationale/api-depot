import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';
import { ApiAnnuraireModule } from '../api_annuraire/api_annuraire.module';
import { Habilitation, HabilitationSchema } from './habilitation.schema';
import { HabilitationService } from './habilitation.service';
import { HabilitationController } from './habilitation.controller';
import { MailerModule } from '../mailer/mailer.module';
import { FranceConnectStrategy } from './france_connect/france_connect.strategy';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { ClientModule } from '../client/client.module';
import {
  FranceConnectAuthGuard,
  FranceConnectCallBackGuard,
} from './france_connect/france_connect.guard';
import { HabilitationMiddleware } from './habilitation.middleware';
import { CommuneMiddleware } from 'src/lib/class/middlewares/commune.middleware';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: Habilitation.name, schema: HabilitationSchema },
    ]),
    ApiAnnuraireModule,
    MailerModule,
    PassportModule.register({ session: true }),
    ClientModule,
  ],
  providers: [
    HabilitationService,
    FranceConnectStrategy,
    FranceConnectAuthGuard,
    FranceConnectCallBackGuard,
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
        method: RequestMethod.POST,
      })
      .forRoutes(HabilitationController);

    consumer.apply(CommuneMiddleware).forRoutes({
      path: 'communes/:codeCommune/habilitations',
      method: RequestMethod.POST,
    });
  }
}
