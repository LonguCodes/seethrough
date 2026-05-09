import { Injectable } from '@nestjs/common';
import { TriggerStrategy } from './trigger-strategy.interface.js';
import { AlertScope, TargetType } from '../alert.enums.js';
import { PvcData } from './scope-data.types.js';

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

interface PvcThresholdParameters {
  threshold: number;
}

@Injectable()
export class PvcUsageStrategy implements TriggerStrategy<PvcData, PvcThresholdParameters> {
  readonly type = 'pvc_usage';
  readonly targetType = TargetType.PVC;
  readonly supportedScopes = [AlertScope.CLUSTER, AlertScope.NAMESPACE, AlertScope.PVC];
  readonly requiredParameters = ['threshold'];
  readonly allParameters = ['threshold'];
  readonly unit = '%';

  evaluate(data: PvcData, parameters: PvcThresholdParameters): boolean {
    if (!data.used || !data.capacity) return false;

    const capacityBytes = parseKubernetesQuantity(data.capacity);
    if (capacityBytes === 0) return false;

    const threshold = parameters.threshold || 80;
    const usage = (data.used / capacityBytes) * 100;
    return usage >= threshold;
  }

  getMessage(data: PvcData, parameters: PvcThresholdParameters): string {
    const capacityBytes = parseKubernetesQuantity(data.capacity);
    const usage = capacityBytes > 0 ? (data.used / capacityBytes) * 100 : 0;
    const threshold = parameters.threshold || 80;

    return `PVC ${data.name} in namespace ${data.namespace} usage is ${usage.toFixed(1)}% (Threshold: ${threshold}%)`;
  }
}
