import type { AlertScope } from '../alert.enums.js';
import type { NodeMetricData, PodInfoData, PvcInfoData, ClusterInfoData, TargetItem } from './target-data.types.js';

export type TargetDataType = NodeMetricData | PodInfoData | PvcInfoData;
export type ClusterDataInput = NodeMetricData[] | ClusterInfoData;

export interface AlertTarget {
  readonly type: string;
  readonly label: string;
  getTargets(
    scope: AlertScope,
    scopeValue: string | null,
    metrics: NodeMetricData[],
    clusterInfo: ClusterInfoData,
  ): TargetItem[];
}