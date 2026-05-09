import { Injectable } from '@nestjs/common';
import { TriggerStrategy } from './trigger-strategy.interface.js';
import { AlertScope, TargetType } from '../alert.enums.js';
import { NodeData } from './scope-data.types.js';

interface CpuParameters {
  threshold: number;
}

@Injectable()
export class CpuThresholdStrategy implements TriggerStrategy<NodeData, CpuParameters> {
  readonly type = 'cpu_threshold';
  readonly targetType = TargetType.NODE;
  readonly supportedScopes = [AlertScope.CLUSTER, AlertScope.NODE];
  readonly requiredParameters = ['threshold'];
  readonly allParameters = ['threshold'];
  readonly unit = '%';

  evaluate(data: NodeData, parameters: CpuParameters): boolean {
    const threshold = parameters.threshold || 80;
    return data.cpuUsage > threshold;
  }

  getMessage(data: NodeData, parameters: CpuParameters): string {
    return `CPU usage is ${data.cpuUsage.toFixed(2)}%, which exceeds the threshold of ${parameters.threshold}%`;
  }
}
