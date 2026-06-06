import type { MachineMetric } from '../metric.entity.js';

export interface IMetricsStorage {
  save(metric: Partial<MachineMetric>): Promise<MachineMetric>;
  getLatest(): Promise<MachineMetric[]>;
  getHistory(machineId: string): Promise<MachineMetric[]>;
  getMetricsInTimeRange(machineId: string, since: Date): Promise<MachineMetric[]>;
}

export const METRICS_STORAGE_TOKEN = 'METRICS_STORAGE';