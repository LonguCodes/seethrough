import { MachineMetric } from '../metric.entity.js';

export interface IMetricsStorage {
  save(metric: Partial<MachineMetric>): Promise<MachineMetric>;
  getLatest(): Promise<MachineMetric[]>;
  getHistory(machineId: string): Promise<MachineMetric[]>;
}
