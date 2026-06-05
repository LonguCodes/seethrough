import type { AlertScope, TargetType } from '../alert.enums.js';
import type { AlertTriggerData } from './scope-data.types.js';

export interface TriggerStrategy<T extends AlertTriggerData = AlertTriggerData, P = any> {
  /**
   * The unique identifier for this strategy type (matches AlertTrigger.type)
   */
  readonly type: string;

  /**
   * The type of resource this strategy evaluates.
   */
  readonly targetType: TargetType;

  /**
   * Scopes supported by this strategy for filtering.
   */
  readonly supportedScopes: AlertScope[];

  /**
   * List of parameter keys required by this strategy.
   */
  readonly requiredParameters: string[];

  /**
   * List of all parameter keys supported by this strategy.
   */
  readonly allParameters: string[];

  /**
   * Optional unit for the parameters (e.g. '%', 'MB')
   */
  readonly unit?: string;

  /**
   * Evaluates the data against the given parameters.
   * @param data The current state/metrics of the entity being evaluated.
   * @param parameters The configuration parameters from the AlertTrigger.
   * @returns true if the alert should trigger, false otherwise.
   */
  evaluate(data: T, parameters: P): boolean;

  /**
   * Generates a human-readable message for the alert instance.
   * @param data The data used for evaluation.
   * @param parameters The configuration parameters.
   */
  getMessage(data: T, parameters: P): string;
}
