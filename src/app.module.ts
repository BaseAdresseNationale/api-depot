import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { HabilitationModule } from '@/modules/habilitation/habilitation.module';
import { MandataireModule } from '@/modules/mandataire/mandataire.module';
import { ChefDeFileModule } from '@/modules/chef_de_file/chef_de_file.module';
import { ClientModule } from '@/modules/client/client.module';
import { RevisionModule } from '@/modules/revision/revision.module';
import { StatModule } from '@/modules/stats/stats.module';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../'),
      renderPath: 'public/',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get('MONGODB_URL'),
        dbName: config.get('MONGODB_DBNAME'),
      }),
      inject: [ConfigService],
    }),
    HabilitationModule,
    ChefDeFileModule,
    MandataireModule,
    ClientModule,
    RevisionModule,
    StatModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
