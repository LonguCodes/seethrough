import { Injectable } from '@nestjs/common';
import { AlertTarget } from './target.interface.js';
import { AlertScope } from '../alert.enums.js';
import { TriggerProperty } from './trigger-property.decorator.js';
import type { PvcInfoData, ClusterInfoData, NodeMetricData, PvcUsageEntry } from './target-data.types.js';

function parseKubernetesQuantity(quantity: string | undefined): number {
  if (!quantity) return 0;

  const units: Record<string, number> = {
    'Ki': 1024,
    'Mi': 1024 ** 2,
    'Gi': 1024 ** 3,
    'Ti': 1024 ** 4,
    'Pi': 1024 ** 5,
    'Ei': 1024 ** 6,
    'k': 1000,
    'm': 1000 ** 2,
    'g': 1000 ** 3,
    't': 1000 ** 4,
    'p': 1000 ** 5,
    'e': 1000 ** 6,
  };

  const match = (quantity as string).match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
  if (!match) return 0;

  const value = parseFloat(match[1] || '0');
  const unit = match[2];

  if (!unit) return value;

  const factor = units[unit] || units[unit.toLowerCase()];
  return factor ? value * factor : value;
}

function findPvcUsage(metrics: NodeMetricData[], volumeName?: string): number {
  if (!volumeName) return 0;
  for (const m of metrics) {
    const usage = (m.pvcUsage || []).find((u: PvcUsageEntry) => u.name === volumeName);
    if (usage) return usage.used;
  }
  return 0;
}

@Injectable()
export class PvcTarget implements AlertTarget {
  readonly type = 'PVC';
  readonly label = 'Persistent Volume Claim';

  @TriggerProperty<PvcInfoData>({
    name: 'status',
    label: 'PVC Status',
    type: 'enum',
    enumValues: ['Bound', 'Pending', 'Lost'],
    description: 'The current status of the PVC',
    supportedConditionTypes: ['eq', 'neq', 'in'],
    getValue: (data: PvcInfoData) => data.status ?? '',
  })
  status: string;

  @TriggerProperty<PvcInfoData & { used?: number }>({
    name: 'usagePercent',
    label: 'Usage Percentage',
    type: 'number',
    unit: '%',
    description: 'Percentage of PVC capacity used',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: PvcInfoData & { used?: number }) => {
      if (!data.used || !data.capacity) return 0;
      const capacityBytes = parseKubernetesQuantity(data.capacity);
      if (capacityBytes === 0) return 0;
      return (data.used / capacityBytes) * 100;
    },
  })
  usagePercent: number;

  getTargets(
    scope: AlertScope,
    scopeValue: string | null,
    metrics: NodeMetricData[],
    clusterInfo: ClusterInfoData,
  ) {
    const baseData = (clusterInfo.pvcs || []).map(p => ({
      id: p.name,
      data: { ...p, used: findPvcUsage(metrics, p.volumeName) },
    }));

    switch (scope) {
      case AlertScope.CLUSTER:
        return baseData;
      case AlertScope.NAMESPACE:
        return baseData.filter(item => item.data.namespace === scopeValue);
      case AlertScope.PVC:
        return baseData.filter(item => item.id === scopeValue);
      default:
        return [];
    }
  }
}