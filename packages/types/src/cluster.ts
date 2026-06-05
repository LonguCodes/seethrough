export interface ContainerStatusData {
  name: string;
  ready: boolean;
  restartCount: number;
  state: string;
  started: boolean;
}

export interface PodInfoData {
  name: string;
  namespace: string;
  status: string;
  nodeName: string;
  podIP?: string;
  startTime?: string;
  restartCount?: number;
  labels?: Record<string, string>;
  containerStatuses?: ContainerStatusData[];
}

export interface PvcUsageEntry {
  name: string;
  mount: string;
  used: number;
}

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

export interface DeploymentConditionData {
  type: string;
  status: string;
  reason: string;
  message: string;
}

export interface DeploymentInfoData {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  availableReplicas: number;
  unavailableReplicas: number;
  updatedReplicas: number;
  conditions: DeploymentConditionData[];
}

export interface StatefulSetConditionData {
  type: string;
  status: string;
  reason: string;
  message: string;
}

export interface StatefulSetInfoData {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  currentReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  conditions: StatefulSetConditionData[];
}

export interface DaemonSetConditionData {
  type: string;
  status: string;
  reason: string;
  message: string;
}

export interface DaemonSetInfoData {
  name: string;
  namespace: string;
  desiredNumberScheduled: number;
  currentNumberScheduled: number;
  numberReady: number;
  numberAvailable: number;
  numberUnavailable: number;
  updatedNumberScheduled: number;
  conditions: DaemonSetConditionData[];
}

export interface NodeMetricData {
  machineId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  pvcUsage: PvcUsageEntry[];
  timestamp: Date;
}

export interface ClusterInfoData {
  nodes: Record<string, unknown>[];
  namespaces: string[];
  pvcs: PvcInfoData[];
  pods: PodInfoData[];
  deployments: DeploymentInfoData[];
  statefulSets: StatefulSetInfoData[];
  daemonSets: DaemonSetInfoData[];
  timestamp: string;
}