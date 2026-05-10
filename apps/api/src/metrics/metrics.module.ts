import { Module } from '@nestjs/common';
import { MachineMetric } from './metric.entity.js';
import { MetricsService } from './metrics.service.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsGateway } from './metrics.gateway.js';
import { ConfigToken } from '@longucodes/config';
import { AppConfig } from '../config/app.config.js';
import { Redis } from 'ioredis';
import { RedisStorageStrategy } from './strategies/redis-storage.strategy.js';

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
      provide: 'METRICS_STORAGE',
      inject: ['REDIS_CLIENT'],
      useFactory: (redis: Redis) => {
        return new RedisStorageStrategy(redis);
      },
    }
  ],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}





