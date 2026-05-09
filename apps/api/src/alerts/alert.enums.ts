export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
}

export enum AlertScope {
  CLUSTER = 'cluster',
  NAMESPACE = 'namespace',
  NODE = 'node',
  POD = 'pod',
  PVC = 'pvc',
}

export enum TargetType {
  NODE = 'node',
  POD = 'pod',
  PVC = 'pvc',
}
