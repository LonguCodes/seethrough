import { Injectable, Inject } from '@nestjs/common';
import { MachineMetric } from './metric.entity.js';
import type { IMetricsStorage } from './strategies/metrics-storage.interface.js';

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRICS_STORAGE') private readonly storage: IMetricsStorage,
  ) { }

  async saveMetric(
    machineId: string,
    cpuUsage: number,
    ramUsage: number,
    diskUsage: number,
  ): Promise<MachineMetric> {
    return this.storage.save({
      machineId,
      cpuUsage,
      ramUsage,
      diskUsage,
      timestamp: new Date(),
    });
  }

  async getLatestMetrics(): Promise<MachineMetric[]> {
    return this.storage.getLatest();
  }

  async getMachineHistory(machineId: string): Promise<MachineMetric[]> {
    return this.storage.getHistory(machineId);
  }
}



