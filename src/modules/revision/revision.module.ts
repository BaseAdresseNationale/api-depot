import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { CommuneMiddleware } from '@/lib/class/middlewares/commune.middleware';
import { ClientModule } from '@/modules/client/client.module';
import { FileModule } from '@/modules/file/file.module';
import { ChefDeFileModule } from '@/modules/chef_de_file/chef_de_file.module';
import { BanModule } from '@/modules/ban/ban.module';
import { MailerModule } from '@/modules/mailer/mailer.module';
import { HabilitationModule } from '@/modules/habilitation/habilitation.module';
import { MandataireModule } from '@/modules/mandataire/mandataire.module';
import { RevisionMiddleware } from './revision.middleware';
import { ValidationService } from './validation.service';
import { Revision, RevisionSchema } from './revision.schema';
import { RevisionService } from './revision.service';
import { RevisionController } from './revision.controller';
import { NotifyService } from './notify.service';

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
