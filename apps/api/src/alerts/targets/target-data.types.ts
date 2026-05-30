// === Node Target Types ===

export interface NodeMetricData {
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  pvcUsage: PvcUsageEntry[];
  timestamp: Date;
}

export interface PvcUsageEntry {
  name: string;
  mount: string;
  used: number;
}

// === Pod Target Types ===

export interface PodInfoData {
  name: string;
  namespace: string;
  status: string;
  nodeName: string;
  podIP?: string;
  startTime?: string;
  restartCount?: number;
  labels?: Record<string, string>;
}

// === PVC Target Types ===

export interface PvcInfoData {
  name: string;
  namespace: string;
  status: string;
  storageClass?: string;
  capacity?: string;
  used?: number;
  volumeName?: string;
  accessModes?: string[];
}

// === Cluster Info Type ===

export interface ClusterInfoData {
  nodes: any[];
  namespaces: string[];
  pvcs: PvcInfoData[];
  pods: PodInfoData[];
  timestamp: string;
}

// === Target Item (what getTargets returns) ===

export interface TargetItem<T = any> {
  id: string;
  data: T;
}