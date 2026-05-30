import type { ConditionType } from '../targets/trigger-property.decorator.js';

/**
 * ConditionValue is always an object. The shape depends on the conditionType:
 * - 'eq' / 'neq' / 'gt' / 'gte' / 'lt' / 'lte' → { value: number | string }
 * - 'range' → { min: number; max: number }
 * - 'in' → { values: (number | string)[] }
 */
export type SingleConditionValue = { value: number | string };
export type RangeConditionValue = { min: number; max: number };
export type InConditionValue = { values: number[] | string[] };

export type ConditionValue = SingleConditionValue | RangeConditionValue | InConditionValue;

/**
 * Helper to extract the semantic value from a ConditionValue based on the condition type.
 */
export function getCompareValue(conditionType: ConditionType, conditionValue: ConditionValue): number | string | number[] | string[] | undefined {
  switch (conditionType) {
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return (conditionValue as SingleConditionValue).value;
    case 'range':
      return undefined; // compare uses min/max directly
    case 'in':
      return (conditionValue as InConditionValue).values;
  }
}

export function isSingleValue(conditionValue: ConditionValue): conditionValue is SingleConditionValue {
  return 'value' in conditionValue;
}

export function isRangeValue(conditionValue: ConditionValue): conditionValue is RangeConditionValue {
  return 'min' in conditionValue && 'max' in conditionValue;
}

export function isInValue(conditionValue: ConditionValue): conditionValue is InConditionValue {
  return 'values' in conditionValue;
}

/**
 * Derive the ConditionValue shape from conditionType for use in the create DTO.
 */
export function defaultValueForConditionType(conditionType: ConditionType, value: number | string | undefined): ConditionValue {
  switch (conditionType) {
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return { value: value ?? '' };
    case 'range':
      return { min: 0, max: 0 };
    case 'in':
      return { values: [] };
  }
}