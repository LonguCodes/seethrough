import { Injectable } from '@nestjs/common';

import type { AlertTarget } from './target.interface.js';
import { AlertScope } from '../alert.enums.js';
import type { PodInfoData, ClusterInfoData, NodeMetricData } from './target-data.types.js';
import { TriggerProperty } from './trigger-property.decorator.js';

@Injectable()
export class PodTarget implements AlertTarget {
  readonly type = 'Pod';
  readonly label = 'Pod';

  @TriggerProperty<PodInfoData>({
    name: 'status',
    label: 'Pod Status',
    type: 'enum',
    enumValues: ['Running', 'Pending', 'Succeeded', 'Failed', 'Unknown', 'CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'OOMKilled', 'Completed'],
    description: 'The current phase of the pod',
    supportedConditionTypes: ['eq', 'neq', 'in'],
    getValue: (data: PodInfoData) => data.status ?? '',
  })
  status: string;

  @TriggerProperty<PodInfoData>({
    name: 'restartCount',
    label: 'Restart Count',
    type: 'number',
    description: 'Total number of container restarts across all containers',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: PodInfoData) => {
      if (data.containerStatuses?.length) {
        return data.containerStatuses.reduce((sum, cs) => sum + cs.restartCount, 0);
      }
      return data.restartCount ?? 0;
    },
  })
  restartCount: number;

  @TriggerProperty<PodInfoData>({
    name: 'containerReady',
    label: 'Containers Ready',
    type: 'number',
    description: 'Number of containers that are ready',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: PodInfoData) => {
      const statuses = data.containerStatuses || [];
      return statuses.filter(cs => cs.ready).length;
    },
  })
  containerReady: number;

  @TriggerProperty<PodInfoData>({
    name: 'containerReadyRatio',
    label: 'Container Ready Ratio',
    type: 'number',
    unit: '%',
    description: 'Percentage of containers that are ready',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: PodInfoData) => {
      const statuses = data.containerStatuses || [];
      if (statuses.length === 0) return 100;
      const ready = statuses.filter(cs => cs.ready).length;
      return (ready / statuses.length) * 100;
    },
  })
  containerReadyRatio: number;

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
