import { Module } from '@nestjs/common';

import { StatService } from './stats.service';
import { StatController } from './stats.controller';
import { RevisionModule } from '../revision/revision.module';
import { ClientModule } from '../client/client.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, RevisionModule, ClientModule],
  providers: [StatService],
  controllers: [StatController],
  exports: [StatService],
})
export class StatModule {}
