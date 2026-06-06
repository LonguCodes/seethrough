import { Injectable } from "@nestjs/common";

import type {
  ConditionValue,
  SingleConditionValue,
  RangeConditionValue,
  InConditionValue,
} from "./condition-value.types.js";
import { TargetRegistry } from "../targets/target.registry.js";
import { getTriggerProperties } from "../targets/trigger-property.decorator.js";
import type {
  ConditionType,
  TriggerPropertyMetadata,
} from "../targets/trigger-property.decorator.js";

export interface ConditionConfig {
  targetType: string;
  property: string;
  conditionType: ConditionType;
  value: ConditionValue;
}

export interface EvaluationResult {
  matched: boolean;
  actualValue: number | string | undefined;
}

export interface FormatMessageVariables {
  targetType: string;
  targetId: string;
  property: string;
  value: number | string | undefined;
  threshold: string;
  conditionType: string;
}

@Injectable()
export class ConditionEvaluator {
  constructor(private readonly targetRegistry: TargetRegistry) {}

  private getPropertyDef(
    targetType: string,
    property: string,
  ): TriggerPropertyMetadata | undefined {
    const target = this.targetRegistry.getTarget(targetType);
    if (!target) return undefined;
    const properties = getTriggerProperties(target.constructor);
    return properties.find((p) => p.name === property);
  }

  /**
   * Evaluate a single data point against a condition.
   */
  evaluate(data: Record<string, unknown>, condition: ConditionConfig): EvaluationResult {
    const propDef = this.getPropertyDef(condition.targetType, condition.property);
    if (!propDef) {
      return { matched: false, actualValue: undefined };
    }

    const actualValue = propDef.getValue(data);
    const matched = this.matches(actualValue, condition.conditionType, condition.value);
    return { matched, actualValue };
  }

  /**
   * Evaluate multiple data points (for lookback). Returns true only if ALL points match.
   */
  evaluateMultiple(
    dataPoints: Record<string, unknown>[],
    condition: ConditionConfig,
  ): EvaluationResult {
    if (dataPoints.length === 0) {
      return { matched: false, actualValue: undefined };
    }

    const propDef = this.getPropertyDef(condition.targetType, condition.property);
    if (!propDef) {
      return { matched: false, actualValue: undefined };
    }

    if (dataPoints.length === 1) {
      const actualValue = propDef.getValue(dataPoints[0]);
      return {
        matched: this.matches(actualValue, condition.conditionType, condition.value),
        actualValue,
      };
    }

    let lastActualValue: number | string | undefined;

    for (const point of dataPoints) {
      const actualValue = propDef.getValue(point);
      lastActualValue = actualValue;
      if (!this.matches(actualValue, condition.conditionType, condition.value)) {
        return { matched: false, actualValue };
      }
    }

    return { matched: true, actualValue: lastActualValue };
  }

  private matches(
    value: number | string,
    conditionType: ConditionType,
    conditionValue: ConditionValue,
  ): boolean {
    switch (conditionType) {
      case "eq":
      case "neq":
      case "gt":
      case "gte":
      case "lt":
      case "lte": {
        const v = (conditionValue as SingleConditionValue).value;
        if (conditionType === "eq") return value === v;
        if (conditionType === "neq") return value !== v;
        if (typeof value !== "number" || typeof v !== "number") return false;
        if (conditionType === "gt") return value > v;
        if (conditionType === "gte") return value >= v;
        if (conditionType === "lt") return value < v;
        if (conditionType === "lte") return value <= v;
        return false;
      }
      case "range": {
        if (typeof value !== "number") return false;
        const range = conditionValue as RangeConditionValue;
        return value >= range.min && value <= range.max;
      }
      case "in": {
        const inValues = (conditionValue as InConditionValue).values;
        return (inValues as Array<string | number>).includes(value);
      }
      default:
        return false;
    }
  }

  /**
   * Generate a default message for an alert.
   */
  generateDefaultMessage(
    condition: ConditionConfig,
    targetId: string,
    actualValue: number | string | undefined,
  ): string {
    const { targetType, property, conditionType, value } = condition;

    switch (conditionType) {
      case "eq":
        return `${targetType} "${targetId}" has ${property} = "${actualValue}" (expected = "${(value as SingleConditionValue).value}")`;
      case "neq":
        return `${targetType} "${targetId}" has ${property} = "${actualValue}" (expected ≠ "${(value as SingleConditionValue).value}")`;
      case "gt":
        return `${targetType} "${targetId}" has ${property} = ${actualValue} (exceeds ${(value as SingleConditionValue).value})`;
      case "gte":
        return `${targetType} "${targetId}" has ${property} = ${actualValue} (≥ ${(value as SingleConditionValue).value})`;
      case "lt":
        return `${targetType} "${targetId}" has ${property} = ${actualValue} (below ${(value as SingleConditionValue).value})`;
      case "lte":
        return `${targetType} "${targetId}" has ${property} = ${actualValue} (≤ ${(value as SingleConditionValue).value})`;
      case "range": {
        const range = value as RangeConditionValue;
        return `${targetType} "${targetId}" has ${property} = ${actualValue} (range: ${range.min} - ${range.max})`;
      }
      case "in": {
        const inValue = value as InConditionValue;
        return `${targetType} "${targetId}" has ${property} = "${actualValue}" (expected one of: ${inValue.values.join(", ")})`;
      }
      default:
        return `${targetType} "${targetId}" triggered an alert on ${property} (current: ${actualValue})`;
    }
  }

  /**
   * Format a user-provided message template with variables.
   * Supports: {targetType}, {targetId}, {property}, {value}, {conditionType}, {threshold}
   */
  formatMessage(template: string, variables: FormatMessageVariables): string {
    const vars: Record<string, unknown> = { ...variables };
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] !== undefined ? String(vars[key]) : match;
    });
  }
}
