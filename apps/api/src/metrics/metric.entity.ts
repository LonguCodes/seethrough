import type { PvcUsageEntry } from '../alerts/targets/target-data.types.js';

export class MachineMetric {
  id: string;
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  pvcUsage: PvcUsageEntry[];
  timestamp: Date;
}
