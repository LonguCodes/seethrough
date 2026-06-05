import { ConfigToken } from '@longucodes/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MetricsCollectorService } from './metrics-collector.service.js';
import type { AppConfig } from '../config/app.config.js';

@Module({
  imports: [
    HttpModule,
    JwtModule.registerAsync({
      inject: [ConfigToken],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '10y' },
      }),
    }),
  ],
  providers: [MetricsCollectorService],
})
export class MetricsModule {}
