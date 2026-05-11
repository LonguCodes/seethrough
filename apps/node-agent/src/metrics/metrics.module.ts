import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigToken } from '@longucodes/config';
import type { AppConfig } from '../config/app.config.js';
import { MetricsCollectorService } from './metrics-collector.service.js';

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
