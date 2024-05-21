import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiAnnuaireService } from './api_annuraire.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('API_ANNUAIRE_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ApiAnnuaireService],
  controllers: [],
  exports: [ApiAnnuaireService],
})
export class ApiAnnuraireModule {}
