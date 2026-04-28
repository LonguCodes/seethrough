import { Module } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
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
import { PostgresStorageStrategy } from './strategies/postgres-storage.strategy.js';
import { ValkeyStorageStrategy } from './strategies/valkey-storage.strategy.js';
import { MultiStorageStrategy } from './strategies/multi-storage.strategy.js';
import { Repository } from 'typeorm';
import { IMetricsStorage } from './strategies/metrics-storage.interface.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MachineMetric]),
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
      provide: 'VALKEY_CLIENT',
      inject: [ConfigToken],
      useFactory: (config: AppConfig) => {
        return new Redis({
          host: config.valkey.host,
          port: config.valkey.port,
        });
      },
    },
    {
      provide: 'METRICS_STORAGE',
      inject: [ConfigToken, getRepositoryToken(MachineMetric), 'VALKEY_CLIENT'],
      useFactory: (config: AppConfig, repo: Repository<MachineMetric>, valkey: Redis) => {
        const modes = config.storageMode.split(',').map(s => s.trim());
        const strategies: IMetricsStorage[] = [];
        
        for (const mode of modes) {
          if (mode === 'valkey') {
            strategies.push(new ValkeyStorageStrategy(valkey));
          } else if (mode === 'postgres') {
            strategies.push(new PostgresStorageStrategy(repo));
          }
        }
        
        if (strategies.length === 0) {
          // Fallback to postgres if none matched
          strategies.push(new PostgresStorageStrategy(repo));
        }
        
        return new MultiStorageStrategy(strategies);
      },

    }
  ],
  controllers: [MetricsController],
})
export class MetricsModule {}





