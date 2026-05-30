import { Injectable } from '@nestjs/common';
import { AlertTarget } from './target.interface.js';
import { AlertScope } from '../alert.enums.js';
import { TriggerProperty } from './trigger-property.decorator.js';
import type { DaemonSetInfoData, ClusterInfoData, NodeMetricData } from './target-data.types.js';

@Injectable()
export class DaemonSetTarget implements AlertTarget {
  readonly type = 'DaemonSet';
  readonly label = 'DaemonSet';

  @TriggerProperty<DaemonSetInfoData>({
    name: 'desiredNumberScheduled',
    label: 'Desired Scheduled',
    type: 'number',
    description: 'Number of nodes that should be running the daemon pod',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DaemonSetInfoData) => data.desiredNumberScheduled,
  })
  desiredNumberScheduled: number;

  @TriggerProperty<DaemonSetInfoData>({
    name: 'currentNumberScheduled',
    label: 'Current Scheduled',
    type: 'number',
    description: 'Number of nodes running at least one daemon pod',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DaemonSetInfoData) => data.currentNumberScheduled,
  })
  currentNumberScheduled: number;

  @TriggerProperty<DaemonSetInfoData>({
    name: 'numberReady',
    label: 'Ready',
    type: 'number',
    description: 'Number of nodes with ready daemon pods',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DaemonSetInfoData) => data.numberReady,
  })
  numberReady: number;

  @TriggerProperty<DaemonSetInfoData>({
    name: 'numberAvailable',
    label: 'Available',
    type: 'number',
    description: 'Number of available daemon pods',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DaemonSetInfoData) => data.numberAvailable,
  })
  numberAvailable: number;

  @TriggerProperty<DaemonSetInfoData>({
    name: 'numberUnavailable',
    label: 'Unavailable',
    type: 'number',
    description: 'Number of unavailable daemon pods',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DaemonSetInfoData) => data.numberUnavailable,
  })
  numberUnavailable: number;

  @TriggerProperty<DaemonSetInfoData>({
    name: 'updatedNumberScheduled',
    label: 'Updated Scheduled',
    type: 'number',
    description: 'Number of nodes running updated daemon pods',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DaemonSetInfoData) => data.updatedNumberScheduled,
  })
  updatedNumberScheduled: number;

  getTargets(
    scope: AlertScope,
    scopeValue: string | null,
    _metrics: NodeMetricData[],
    clusterInfo: ClusterInfoData,
  ) {
    const baseData = (clusterInfo.daemonSets || []).map(d => ({ id: d.name, data: d }));

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