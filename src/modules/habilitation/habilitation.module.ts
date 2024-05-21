import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';

import { CommuneMiddleware } from '@/lib/class/middlewares/commune.middleware';
import { ApiAnnuraireModule } from '@/modules/api_annuraire/api_annuraire.module';
import { MailerModule } from '@/modules/mailer/mailer.module';
import { ClientModule } from '@/modules/client/client.module';
import { Habilitation, HabilitationSchema } from './habilitation.schema';
import { HabilitationService } from './habilitation.service';
import { HabilitationController } from './habilitation.controller';
import { FranceConnectStrategy } from './france_connect/france_connect.strategy';
import {
  FranceConnectAuthGuard,
  FranceConnectCallBackGuard,
} from './france_connect/france_connect.guard';
import { HabilitationMiddleware } from './habilitation.middleware';

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
