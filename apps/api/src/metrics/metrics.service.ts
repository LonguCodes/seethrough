import { Injectable, Inject } from '@nestjs/common';

import type { MachineMetric } from './metric.entity.js';
import type { IMetricsStorage } from './strategies/metrics-storage.interface.js';
import { METRICS_STORAGE_TOKEN } from './strategies/metrics-storage.interface.js';

@Injectable()
export class MetricsService {
  constructor(
    @Inject(METRICS_STORAGE_TOKEN) private readonly storage: IMetricsStorage,
  ) { }

  async saveMetric(
    machineId: string,
    cpuUsage: number,
    ramUsage: number,
    diskUsage: number,
    pvcUsage: any[] = [],
  ): Promise<MachineMetric> {
    return this.storage.save({
      machineId,
      cpuUsage,
      ramUsage,
      diskUsage,
      pvcUsage,
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



