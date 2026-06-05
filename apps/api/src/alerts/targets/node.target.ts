import { Injectable } from '@nestjs/common';

import type { AlertTarget } from './target.interface.js';
import { AlertScope } from '../alert.enums.js';
import type { NodeMetricData, ClusterInfoData } from './target-data.types.js';
import { TriggerProperty } from './trigger-property.decorator.js';

@Injectable()
export class NodeTarget implements AlertTarget {
  readonly type = 'Node';
  readonly label = 'Node';

  @TriggerProperty({
    name: 'cpuUsage',
    label: 'CPU Usage',
    type: 'number',
    unit: '%',
    description: 'CPU usage percentage of the node',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: NodeMetricData) => data.cpuUsage ?? 0,
  })
  cpuUsage: number;

  @TriggerProperty({
    name: 'ramUsage',
    label: 'RAM Usage',
    type: 'number',
    unit: '%',
    description: 'RAM usage percentage of the node',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: NodeMetricData) => data.ramUsage ?? 0,
  })
  ramUsage: number;

  @TriggerProperty({
    name: 'diskUsage',
    label: 'Disk Usage',
    type: 'number',
    unit: '%',
    description: 'Disk usage percentage of the node',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: NodeMetricData) => data.diskUsage ?? 0,
  })
  diskUsage: number;

  getTargets(
    scope: AlertScope,
    scopeValue: string | null,
    metrics: NodeMetricData[],
    _clusterInfo: ClusterInfoData,
  ) {
    const baseData = metrics.map(m => ({ id: m.machineId, data: m }));

    switch (scope) {
      case AlertScope.CLUSTER:
        return baseData;
      case AlertScope.NODE:
        return baseData.filter(item => item.id === scopeValue);
      default:
        return [];
    }
  }
}