import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RevisionModule } from '@/modules/revision/revision.module';
import { ClientModule } from '@/modules/client/client.module';
import { StatService } from './stats.service';
import { StatController } from './stats.controller';

@Module({
  imports: [ConfigModule, RevisionModule, ClientModule],
  providers: [StatService],
  controllers: [StatController],
  exports: [StatService],
})
export class StatModule {}
