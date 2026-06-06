import { Injectable } from '@nestjs/common';

import type { AlertTarget } from './target.interface.js';
import { AlertScope } from '../alert.enums.js';
import type { StatefulSetInfoData, ClusterInfoData, NodeMetricData } from './target-data.types.js';
import { TriggerProperty } from './trigger-property.decorator.js';

@Injectable()
export class StatefulSetTarget implements AlertTarget {
  readonly type = 'StatefulSet';
  readonly label = 'StatefulSet';

  @TriggerProperty<StatefulSetInfoData>({
    name: 'replicas',
    label: 'Desired Replicas',
    type: 'number',
    description: 'Number of desired replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: StatefulSetInfoData) => data.replicas,
  })
  replicas: number;

  @TriggerProperty<StatefulSetInfoData>({
    name: 'readyReplicas',
    label: 'Ready Replicas',
    type: 'number',
    description: 'Number of ready replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: StatefulSetInfoData) => data.readyReplicas,
  })
  readyReplicas: number;

  @TriggerProperty<StatefulSetInfoData>({
    name: 'currentReplicas',
    label: 'Current Replicas',
    type: 'number',
    description: 'Number of current replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: StatefulSetInfoData) => data.currentReplicas,
  })
  currentReplicas: number;

  @TriggerProperty<StatefulSetInfoData>({
    name: 'updatedReplicas',
    label: 'Updated Replicas',
    type: 'number',
    description: 'Number of updated replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: StatefulSetInfoData) => data.updatedReplicas,
  })
  updatedReplicas: number;

  @TriggerProperty<StatefulSetInfoData>({
    name: 'availableReplicas',
    label: 'Available Replicas',
    type: 'number',
    description: 'Number of available replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: StatefulSetInfoData) => data.availableReplicas,
  })
  availableReplicas: number;

  getTargets(
    scope: AlertScope,
    scopeValue: string | null,
    _metrics: NodeMetricData[],
    clusterInfo: ClusterInfoData,
  ) {
    const baseData = (clusterInfo.statefulSets || []).map(s => ({ id: s.name, data: s }));

    switch (scope) {
      case AlertScope.CLUSTER:
        return baseData;
      case AlertScope.NAMESPACE:
        return baseData.filter(item => item.data.namespace === scopeValue);
      default:
        return [];
    }
  }
}