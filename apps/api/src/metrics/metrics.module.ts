import { Module } from '@nestjs/common';
import { MachineMetric } from './metric.entity.js';
import { MetricsService } from './metrics.service.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsGateway } from './metrics.gateway.js';
import { ConfigToken } from '@longucodes/config';
import { AppConfig } from '../config/app.config.js';
import { Redis } from 'ioredis';
import { RedisStorageStrategy } from './strategies/redis-storage.strategy.js';
import { METRICS_STORAGE_TOKEN } from './strategies/metrics-storage.interface.js';

@Module({
  imports: [],
  providers: [
    MetricsGateway, 
    MetricsService, 
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
    {
      provide: METRICS_STORAGE_TOKEN,
      inject: ['REDIS_CLIENT', ConfigToken],
      useFactory: (redis: Redis, config: AppConfig) => {
        const retentionSeconds = config.metrics.retentionMinutes * 60;
        return new RedisStorageStrategy(redis, retentionSeconds);
      },
    }
  ],
  controllers: [MetricsController],
  exports: [MetricsService, METRICS_STORAGE_TOKEN],
})
export class MetricsModule {}