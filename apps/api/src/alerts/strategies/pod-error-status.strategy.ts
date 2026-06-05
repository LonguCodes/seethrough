import { Injectable } from '@nestjs/common';

import type { TriggerStrategy } from './trigger-strategy.interface.js';
import { AlertScope, TargetType } from '../alert.enums.js';
import type { PodData } from './scope-data.types.js';

export interface PodErrorParameters {
  targetNamespace?: string;
}

@Injectable()
export class PodErrorStatusStrategy implements TriggerStrategy<PodData, PodErrorParameters> {
  readonly type = 'pod_error_status';
  readonly targetType = TargetType.POD;
  readonly supportedScopes = [AlertScope.CLUSTER, AlertScope.NAMESPACE, AlertScope.POD];
  readonly requiredParameters = [];
  readonly allParameters = [];

  private isErrorStatus(status: string): boolean {
    if (!status) return false;
    const lowerStatus = status.toLowerCase();
    const errorStatuses = ['error', 'crashloopbackoff', 'imagepullbackoff', 'errimagepull', 'failed', 'oomkilled'];
    return errorStatuses.includes(lowerStatus) || lowerStatus.includes('error');
  }

  evaluate(data: PodData, parameters: PodErrorParameters): boolean {
    return this.isErrorStatus(data.status);
  }

  getMessage(data: PodData, parameters: PodErrorParameters): string {
    return `Pod ${data.name} in namespace ${data.namespace} is in an error state: ${data.status}`;
  }
}
