import { ConfigToken } from '@longucodes/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { KubernetesReporterService } from './kubernetes-reporter.service.js';
import { KubernetesService } from './kubernetes.service.js';
import { LogStreamerService } from './log-streamer.service.js';
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
  providers: [KubernetesService, KubernetesReporterService, LogStreamerService],
})
export class KubernetesModule {}
