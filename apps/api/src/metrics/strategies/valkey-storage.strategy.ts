import { Redis } from 'ioredis';
import { MachineMetric } from '../metric.entity.js';
import { IMetricsStorage } from './metrics-storage.interface.js';

export class ValkeyStorageStrategy implements IMetricsStorage {
  constructor(private readonly valkey: Redis) {}

  async save(metric: Partial<MachineMetric>): Promise<MachineMetric> {
    const key = `metrics:${metric.machineId}:${metric.timestamp?.getTime()}`;
    const latestKey = `metrics:latest:${metric.machineId}`;
    const value = JSON.stringify(metric);
    
    await this.valkey.setex(key, 300, value);
    await this.valkey.setex(latestKey, 300, value);
    
    return metric as MachineMetric;
  }

  async getLatest(): Promise<MachineMetric[]> {
    const keys = await this.valkey.keys('metrics:latest:*');
    if (keys.length === 0) return [];
    const values = await this.valkey.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v))
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  }

  async getHistory(machineId: string): Promise<MachineMetric[]> {
    const keys = await this.valkey.keys(`metrics:${machineId}:*`);
    if (keys.length === 0) return [];
    const values = await this.valkey.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v))
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
