import 'reflect-metadata';

export type ConditionType = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'range' | 'in';

export interface TriggerPropertyOptions<TData = any> {
  name: string;
  label: string;
  type: 'number' | 'string' | 'enum';
  enumValues?: string[];
  unit?: string;
  description?: string;
  supportedConditionTypes: ConditionType[];
  getValue: (data: TData) => number | string;
}

export interface TriggerPropertyMetadata extends TriggerPropertyOptions {
  propertyKey: string;
}

export const TRIGGER_PROPERTIES_METADATA_KEY = 'seethrough:trigger-properties';

export function TriggerProperty<TData = any>(options: TriggerPropertyOptions<TData>): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existing: TriggerPropertyMetadata[] = Reflect.getOwnMetadata(TRIGGER_PROPERTIES_METADATA_KEY, target) || [];
    existing.push({ propertyKey: String(propertyKey), ...options });
    Reflect.defineMetadata(TRIGGER_PROPERTIES_METADATA_KEY, existing, target);
  };
}

export function getTriggerProperties(targetClass: any): TriggerPropertyMetadata[] {
  const properties: TriggerPropertyMetadata[] = [];
  let proto = targetClass.prototype || targetClass;
  while (proto) {
    const metadata = Reflect.getOwnMetadata(TRIGGER_PROPERTIES_METADATA_KEY, proto);
    if (metadata) {
      properties.push(...metadata);
    }
    proto = Object.getPrototypeOf(proto);
  }
  return properties;
}