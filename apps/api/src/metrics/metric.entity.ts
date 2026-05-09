export class MachineMetric {
  id: string;
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  pvcUsage: any[];
  timestamp: Date;
}
