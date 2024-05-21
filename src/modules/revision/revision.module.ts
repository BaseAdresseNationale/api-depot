import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';
import { RevisionMiddleware } from './revision.middleware';
import { CommuneMiddleware } from 'src/lib/class/middlewares/commune.middleware';
import { Revision, RevisionSchema } from './revision.schema';
import { RevisionService } from './revision.service';
import { RevisionController } from './revision.controller';
import { ClientModule } from '../client/client.module';
import { FileModule } from '../file/file.module';
import { ValidationService } from './validation.service';
import { ChefDeFileModule } from '../chef_de_file/chef_de_file.module';
import { BanModule } from '../ban/ban.module';
import { NotifyService } from './notify.service';
import { MailerModule } from '../mailer/mailer.module';
import { HabilitationModule } from '../habilitation/habilitation.module';
import { MandataireModule } from '../mandataire/mandataire.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Revision.name, schema: RevisionSchema },
    ]),
    ClientModule,
    FileModule,
    ChefDeFileModule,
    BanModule,
    MailerModule,
    HabilitationModule,
    MandataireModule,
  ],
  providers: [RevisionService, ValidationService, NotifyService],
  controllers: [RevisionController],
  exports: [RevisionService],
})
export class RevisionModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RevisionMiddleware).forRoutes(
      {
        path: 'revisions/:revisionId',
        method: RequestMethod.POST,
      },
      {
        path: 'revisions/:revisionId/files/bal/download',
        method: RequestMethod.GET,
      },
      {
        path: 'revisions/:revisionId/files/bal',
        method: RequestMethod.PUT,
      },
      {
        path: 'revisions/:revisionId/compute',
        method: RequestMethod.POST,
      },
    );

    consumer.apply(CommuneMiddleware).forRoutes(
      {
        path: 'communes/:codeCommune/current-revision',
        method: RequestMethod.GET,
      },
      {
        path: 'communes/:codeCommune/revisions',
        method: RequestMethod.GET,
      },
      {
        path: 'communes/:codeCommune/current-revision/files/bal/download',
        method: RequestMethod.GET,
      },
      {
        path: 'communes/:codeCommune/revisions',
        method: RequestMethod.POST,
      },
    );
  }
}
