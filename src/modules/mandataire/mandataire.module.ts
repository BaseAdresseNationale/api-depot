import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';
import { MandataireService } from './mandataire.service';
import { MandataireController } from './mandataire.controller';
import { MandataireMiddleware } from './mandataire.middleware';
import { Mandataire, MandataireSchema } from './mandataire.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Mandataire.name, schema: MandataireSchema },
    ]),
  ],
  providers: [MandataireService],
  controllers: [MandataireController],
  exports: [MandataireService],
})
export class MandataireModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MandataireMiddleware).forRoutes(MandataireController);
  }
}
