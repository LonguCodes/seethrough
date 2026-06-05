import { Injectable } from '@nestjs/common';

import type { AlertTarget } from './target.interface.js';
import { AlertScope } from '../alert.enums.js';
import type { DeploymentInfoData, ClusterInfoData, NodeMetricData } from './target-data.types.js';
import { TriggerProperty } from './trigger-property.decorator.js';

@Injectable()
export class DeploymentTarget implements AlertTarget {
  readonly type = 'Deployment';
  readonly label = 'Deployment';

  @TriggerProperty<DeploymentInfoData>({
    name: 'replicas',
    label: 'Desired Replicas',
    type: 'number',
    description: 'Number of desired replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DeploymentInfoData) => data.replicas,
  })
  replicas: number;

  @TriggerProperty<DeploymentInfoData>({
    name: 'readyReplicas',
    label: 'Ready Replicas',
    type: 'number',
    description: 'Number of ready replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DeploymentInfoData) => data.readyReplicas,
  })
  readyReplicas: number;

  @TriggerProperty<DeploymentInfoData>({
    name: 'availableReplicas',
    label: 'Available Replicas',
    type: 'number',
    description: 'Number of available replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DeploymentInfoData) => data.availableReplicas,
  })
  availableReplicas: number;

  @TriggerProperty<DeploymentInfoData>({
    name: 'unavailableReplicas',
    label: 'Unavailable Replicas',
    type: 'number',
    description: 'Number of unavailable replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DeploymentInfoData) => data.unavailableReplicas,
  })
  unavailableReplicas: number;

  @TriggerProperty<DeploymentInfoData>({
    name: 'updatedReplicas',
    label: 'Updated Replicas',
    type: 'number',
    description: 'Number of updated replicas',
    supportedConditionTypes: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'],
    getValue: (data: DeploymentInfoData) => data.updatedReplicas,
  })
  updatedReplicas: number;

  @TriggerProperty<DeploymentInfoData>({
    name: 'conditionAvailable',
    label: 'Available Condition',
    type: 'enum',
    enumValues: ['True', 'False', 'Unknown'],
    description: 'Whether the deployment has minimum availability',
    supportedConditionTypes: ['eq', 'neq', 'in'],
    getValue: (data: DeploymentInfoData) => {
      const cond = data.conditions?.find(c => c.type === 'Available');
      return cond?.status ?? 'Unknown';
    },
  })
  conditionAvailable: string;

  @TriggerProperty<DeploymentInfoData>({
    name: 'conditionProgressing',
    label: 'Progressing Condition',
    type: 'enum',
    enumValues: ['True', 'False', 'Unknown'],
    description: 'Whether the deployment is progressing',
    supportedConditionTypes: ['eq', 'neq', 'in'],
    getValue: (data: DeploymentInfoData) => {
      const cond = data.conditions?.find(c => c.type === 'Progressing');
      return cond?.status ?? 'Unknown';
    },
  })
  conditionProgressing: string;

  getTargets(
    scope: AlertScope,
    scopeValue: string | null,
    _metrics: NodeMetricData[],
    clusterInfo: ClusterInfoData,
  ) {
    const baseData = (clusterInfo.deployments || []).map(d => ({ id: d.name, data: d }));

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