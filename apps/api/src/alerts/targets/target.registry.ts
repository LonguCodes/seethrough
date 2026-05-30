import { Injectable } from '@nestjs/common';
import { AlertTarget } from './target.interface.js';
import { getTriggerProperties } from './trigger-property.decorator.js';

@Injectable()
export class TargetRegistry {
  private readonly targetsMap: Map<string, AlertTarget> = new Map();

  constructor(targets: AlertTarget[]) {
    for (const target of targets) {
      this.targetsMap.set(target.type, target);
    }
  }

  getTarget(type: string): AlertTarget | undefined {
    return this.targetsMap.get(type);
  }

  getAllTargets(): AlertTarget[] {
    return Array.from(this.targetsMap.values());
  }

  getTargetSchema(type: string) {
    const target = this.targetsMap.get(type);
    if (!target) return null;
    return {
      type: target.type,
      label: target.label,
      properties: getTriggerProperties(target.constructor),
    };
  }

  getAllTargetSchemas() {
    return this.getAllTargets().map(target => ({
      type: target.type,
      label: target.label,
      properties: getTriggerProperties(target.constructor),
    }));
  }
}