import { Module } from '@nestjs/common';
import { MachineMetric } from './metric.entity.js';
import { MetricsService } from './metrics.service.js';
import { MetricsController } from './metrics.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigToken } from '@longucodes/config';
import { AppConfig } from '../config/app.config.js';
import { MetricsGateway } from './metrics.gateway.js';
import { Redis } from 'ioredis';
import { RedisStorageStrategy } from './strategies/redis-storage.strategy.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigToken],
      useFactory: (config: AppConfig) => ({
        secret: (config as any).jwtSecret || 'default-secret-key-for-dev',
        signOptions: { expiresIn: '10y' },
      }),
    }),
  ],
  providers: [
    MetricsGateway, 
    MetricsService, 
    JwtStrategy,
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
})
export class MetricsModule {}





