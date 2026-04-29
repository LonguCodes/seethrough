import { Module } from '@nestjs/common';
import { ClusterService } from './cluster.service.js';
import { ClusterController } from './cluster.controller.js';
import { ClusterGateway } from './cluster.gateway.js';
import { Redis } from 'ioredis';
import { ConfigToken } from '@longucodes/config';
import { AppConfig } from '../config/app.config.js';

@Module({
  providers: [
    ClusterService,
    ClusterGateway,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigToken],
      useFactory: (config: AppConfig) => {
        return new Redis({
          host: config.redis.host,
          port: config.redis.port,
        });
      },
    },
  ],
  controllers: [ClusterController],
  exports: [ClusterService],
})
export class ClusterModule {}
