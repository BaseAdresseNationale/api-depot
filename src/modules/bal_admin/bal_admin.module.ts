import { Logger, Module } from '@nestjs/common';
import { BalAdminService } from './bal_admin.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('API_BAL_ADMIN_URL'),
        // headers: {
        //   Authorization: `Bearer ${configService.get('API_BAL_ADMIN_TOKEN')}`,
        // },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [BalAdminService, Logger],
  exports: [BalAdminService],
})
export class BalAdminModule {}
