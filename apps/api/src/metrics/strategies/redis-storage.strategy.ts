import { Redis } from 'ioredis';
import { MachineMetric } from '../metric.entity.js';
import { IMetricsStorage } from './metrics-storage.interface.js';

export class RedisStorageStrategy implements IMetricsStorage {
  constructor(
    private readonly redis: Redis,
    private readonly retentionSeconds: number = 21600, // default 6 hours
  ) {}

  async save(metric: Partial<MachineMetric>): Promise<MachineMetric> {
    const machineKey = `metrics:${metric.machineId}`;
    const latestKey = `metrics:latest:${metric.machineId}`;
    const timestamp = metric.timestamp?.getTime() || Date.now();
    const value = JSON.stringify(metric);

    // Use a sorted set for time-range queries: score = timestamp
    await this.redis.zadd(machineKey, timestamp, `${timestamp}:${value}`);
    
    // Set TTL on the sorted set to auto-expire old data
    await this.redis.expire(machineKey, this.retentionSeconds);

    // Keep latest metric separately for fast access
    await this.redis.setex(latestKey, this.retentionSeconds, value);

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
    const machineKey = `metrics:${machineId}`;
    const results = await this.redis.zrevrangebyscore(
      machineKey,
      '+inf',
      '-inf',
    );
    
    return results
      .map((v) => {
        // The stored format is `${timestamp}:${json}`
        const colonIdx = v.indexOf(':');
        if (colonIdx === -1) return null;
        return JSON.parse(v.substring(colonIdx + 1));
      })
      .filter((v): v is any => v !== null)
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  }

  async getMetricsInTimeRange(machineId: string, since: Date): Promise<MachineMetric[]> {
    const machineKey = `metrics:${machineId}`;
    const minScore = since.getTime();
    const maxScore = '+inf';

    const results = await this.redis.zrangebyscore(
      machineKey,
      minScore,
      maxScore,
    );

    return results
      .map((v) => {
        const colonIdx = v.indexOf(':');
        if (colonIdx === -1) return null;
        return JSON.parse(v.substring(colonIdx + 1));
      })
      .filter((v): v is any => v !== null)
      .map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  }
}