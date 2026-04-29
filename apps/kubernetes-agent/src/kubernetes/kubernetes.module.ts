import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KubernetesService } from './kubernetes.service.js';
import { KubernetesReporterService } from './kubernetes-reporter.service.js';
import { LogStreamerService } from './log-streamer.service.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigToken } from '@longucodes/config';
import { AppConfig } from '../config/app.config.js';

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
