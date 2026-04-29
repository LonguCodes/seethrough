import { Redis } from 'ioredis';
import { MachineMetric } from '../metric.entity.js';
import { IMetricsStorage } from './metrics-storage.interface.js';

export class RedisStorageStrategy implements IMetricsStorage {
  constructor(private readonly redis: Redis) {}

  async save(metric: Partial<MachineMetric>): Promise<MachineMetric> {
    const key = `metrics:${metric.machineId}:${metric.timestamp?.getTime()}`;
    const latestKey = `metrics:latest:${metric.machineId}`;
    const value = JSON.stringify(metric);
    
    await this.redis.setex(key, 300, value);
    await this.redis.setex(latestKey, 300, value);
    
    return metric as MachineMetric;
  }

  async getLatest(): Promise<MachineMetric[]> {
    const keys = await this.redis.keys('metrics:latest:*');
    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v))
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  }

  async getHistory(machineId: string): Promise<MachineMetric[]> {
    const keys = await this.redis.keys(`metrics:${machineId}:*`);
    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v))
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
