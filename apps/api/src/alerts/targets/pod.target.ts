import { Injectable } from '@nestjs/common';
import { AlertTarget } from './target.interface.js';
import { AlertScope } from '../alert.enums.js';
import { TriggerProperty } from './trigger-property.decorator.js';
import type { PodInfoData, ClusterInfoData, NodeMetricData } from './target-data.types.js';

@Injectable()
export class PodTarget implements AlertTarget {
  readonly type = 'Pod';
  readonly label = 'Pod';

  @TriggerProperty<PodInfoData>({
    name: 'status',
    label: 'Pod Status',
    type: 'enum',
    enumValues: ['Running', 'Pending', 'Succeeded', 'Failed', 'Unknown', 'CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'OOMKilled', 'Completed'],
    description: 'The current status of the pod',
    supportedConditionTypes: ['eq', 'neq', 'in'],
    getValue: (data: PodInfoData) => data.status ?? '',
  })
  status: string;

  @TriggerProperty<PodInfoData>({
    name: 'restartCount',
    label: 'Restart Count',
    type: 'number',
    description: 'Number of container restarts',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: PodInfoData) => data.restartCount ?? 0,
  })
  restartCount: number;

  @TriggerProperty<PodInfoData>({
    name: 'age',
    label: 'Age',
    type: 'number',
    unit: 'minutes',
    description: 'How long the pod has been running',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: PodInfoData) => {
      if (!data.startTime) return 0;
      const start = new Date(data.startTime).getTime();
      return (Date.now() - start) / 60000;
    },
  })
  age: number;

  getTargets(
    scope: AlertScope,
    scopeValue: string | null,
    _metrics: NodeMetricData[],
    clusterInfo: ClusterInfoData,
  ) {
    const baseData = (clusterInfo.pods || []).map(p => ({ id: p.name, data: p }));

    switch (scope) {
      case AlertScope.CLUSTER:
        return baseData;
      case AlertScope.NAMESPACE:
        return baseData.filter(item => item.data.namespace === scopeValue);
      case AlertScope.POD:
        return baseData.filter(item => item.id === scopeValue);
      default:
        return [];
    }
  }
}