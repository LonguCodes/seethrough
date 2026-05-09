export interface NodeData {
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  timestamp: Date;
}

export interface PodData {
  name: string;
  namespace: string;
  status: string;
  nodeName: string;
  podIP?: string;
  startTime?: string;
  labels?: Record<string, string>;
}

export interface PvcData {
  name: string;
  namespace: string;
  status: string;
  storageClass?: string;
  capacity?: string;
  used?: number;
  accessModes?: string[];
}

export type AlertTriggerData = NodeData | PodData | PvcData;
