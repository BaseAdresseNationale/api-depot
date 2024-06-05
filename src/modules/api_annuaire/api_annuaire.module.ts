import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ApiAnnuaireService } from './api_annuaire.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('API_ANNUAIRE'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ApiAnnuaireService],
  controllers: [],
  exports: [ApiAnnuaireService],
})
export class ApiAnnuaireModule {}
