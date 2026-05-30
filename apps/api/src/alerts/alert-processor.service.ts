import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { ClusterService } from '../cluster/cluster.service.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { ConditionEvaluator, ConditionConfig } from './evaluators/condition-evaluator.service.js';
import { TargetRegistry } from './targets/target.registry.js';
import { AlertScope } from './alert.enums.js';
import { AlertStatus } from './alert.enums.js';
import { AlertTrigger } from './alert-trigger.entity.js';
import { Alert } from './alert.entity.js';
import { interval } from 'rxjs';
import { METRICS_STORAGE_TOKEN } from '../metrics/strategies/metrics-storage.interface.js';
import type { IMetricsStorage } from '../metrics/strategies/metrics-storage.interface.js';
import type { NodeMetricData, ClusterInfoData, TargetItem } from './targets/target-data.types.js';

@Injectable()
export class AlertProcessorService implements OnModuleInit {
  private readonly logger = new Logger(AlertProcessorService.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly clusterService: ClusterService,
    private readonly metricsService: MetricsService,
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly targetRegistry: TargetRegistry,
    @Inject(METRICS_STORAGE_TOKEN) private readonly metricsStorage: IMetricsStorage,
  ) { }

  onModuleInit() {
    this.logger.log('Alert Processor Service started');
    // Check alerts every 30 seconds
    interval(30000).subscribe(() => this.processAlerts());
  }

  async processAlerts() {
    this.logger.debug('Processing alerts...');
    try {
      const triggers = await this.alertsService.findEnabledTriggers();

      if (triggers.length === 0) {
        // Still need to check auto-resolve for existing alerts
        await this.processAutoResolve();
        return;
      }

      const latestMetrics = await this.metricsService.getLatestMetrics();
      const clusterInfo = await this.clusterService.getClusterInfo();

      for (const trigger of triggers) {
        await this.processTrigger(trigger, latestMetrics, clusterInfo);
      }

      // Auto-resolve existing alerts
      await this.processAutoResolve();
    } catch (error) {
      this.logger.error(`Error processing alerts: ${error.message}`, error.stack);
    }
  }

  private async processTrigger(trigger: any, latestMetrics: any[], clusterInfo: any) {
    const target = this.targetRegistry.getTarget(trigger.targetType);
    if (!target) {
      this.logger.warn(`Unknown target type: ${trigger.targetType} for trigger ${trigger.id}`);
      return;
    }

    // 1. Check no-retrigger cooldown
    if (trigger.noRetriggerSeconds > 0 && trigger.lastTriggeredAt) {
      const cooldownEnd = new Date(trigger.lastTriggeredAt.getTime() + trigger.noRetriggerSeconds * 1000);
      if (new Date() < cooldownEnd) {
        this.logger.debug(`Trigger ${trigger.id} is in cooldown period, skipping`);
        return;
      }
    }

    // 2. Get targets
    const targets = target.getTargets(trigger.scope, trigger.scopeValue, latestMetrics, clusterInfo);

    // 3. Build the condition config
    const condition: ConditionConfig = {
      targetType: trigger.targetType,
      property: trigger.targetProperty,
      conditionType: trigger.conditionType,
      value: trigger.conditionValue,
    };

    // 4. Evaluate each target
    for (const targetItem of targets) {
      await this.evaluateTarget(trigger, condition, targetItem);
    }
  }

  private async evaluateTarget(trigger: any, condition: ConditionConfig, targetItem: { id: string; data: any }) {
    try {
      // Get data points for lookback evaluation
      const dataPoints = await this.getDataPoints(targetItem.data, trigger);

      // Evaluate with lookback
      const result = this.conditionEvaluator.evaluateMultiple(dataPoints, condition);

      if (result.matched) {
        // Check if there's already an active alert for this trigger+target
        const activeAlert = await this.alertsService.findActiveAlertForTriggerAndTarget(
          trigger.id,
          targetItem.id,
        );

        if (activeAlert) {
          // Alert already exists, just update the lastMatchedAt timestamp
          await this.alertsService.updateLastMatchedAt(activeAlert.id);
        } else {
          // Create a new alert
          const message = this.buildMessage(trigger, condition, targetItem.id, result.actualValue);
          await this.alertsService.createAlert({
            triggerId: trigger.id,
            triggerType: trigger.targetType,
            message,
            details: {
              target: targetItem.id,
              scope: trigger.scope,
              currentData: targetItem.data,
              actualValue: result.actualValue,
              condition,
            },
          });

          // Update the lastTriggeredAt for no-retrigger cooldown
          await this.alertsService.updateTriggerLastTriggeredAt(trigger.id);
          this.logger.log(`Alert created for trigger "${trigger.name}" on ${targetItem.id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error evaluating target ${targetItem.id} for trigger ${trigger.id}: ${error.message}`);
    }
  }

  private async processAutoResolve() {
    try {
      const activeAlerts = await this.alertsService.findActiveAlerts();

      for (const alert of activeAlerts) {
        const trigger = alert.trigger;
        if (!trigger) {
          // Trigger was deleted, resolve orphaned alerts
          await this.alertsService.resolveAlert(alert.id, true);
          continue;
        }

        if (!trigger.autoResolveEnabled) {
          continue;
        }

        await this.evaluateAutoResolve(alert, trigger);
      }
    } catch (error) {
      this.logger.error(`Error processing auto-resolve: ${error.message}`);
    }
  }

  private async evaluateAutoResolve(alert: any, trigger: any) {
    try {
      const target = this.targetRegistry.getTarget(trigger.targetType);
      if (!target) return;

      const latestMetrics = await this.metricsService.getLatestMetrics();
      const clusterInfo = await this.clusterService.getClusterInfo();
      const targets = target.getTargets(trigger.scope, trigger.scopeValue, latestMetrics, clusterInfo);
      const targetItem = targets.find(t => t.id === alert.details?.target);
      if (!targetItem) return;

      const condition: ConditionConfig = {
        targetType: trigger.targetType,
        property: trigger.targetProperty,
        conditionType: trigger.conditionType,
        value: trigger.conditionValue,
      };

      // Use autoResolveLookbackSeconds if set, otherwise use the trigger's lookbackSeconds
      const resolveLookbackSeconds = trigger.autoResolveLookbackSeconds > 0
        ? trigger.autoResolveLookbackSeconds
        : trigger.lookbackSeconds;

      // For auto-resolve, we want the OPPOSITE: condition should NOT match for the lookback period
      const dataPoints = await this.getDataPoints(targetItem.data, {
        ...trigger,
        lookbackSeconds: resolveLookbackSeconds,
      });

      // For resolve: all points should NOT match the condition
      const result = this.conditionEvaluator.evaluateMultiple(dataPoints, condition);

      if (!result.matched) {
        await this.alertsService.resolveAlert(alert.id, true);
        this.logger.log(`Alert ${alert.id} auto-resolved as condition no longer matches`);
      }
    } catch (error) {
      this.logger.error(`Error evaluating auto-resolve for alert ${alert.id}: ${error.message}`);
    }
  }

  /**
   * Get data points for lookback evaluation.
   * For node metrics, this fetches historical data from storage.
   * For pod/PVC data from cluster info, we only have the current snapshot,
   * so lookback is based on the current cluster info data point only.
   */
  private async getDataPoints(currentData: any, trigger: any): Promise<any[]> {
    const lookbackMs = trigger.lookbackSeconds * 1000;

    if (lookbackMs === 0) {
      // No lookback, just use current data
      return [currentData];
    }

    // For node-type data (from MachineMetric), we can fetch historical
    if (currentData.machineId && trigger.targetType === 'Node') {
      const since = new Date(Date.now() - lookbackMs);
      try {
        const historicalMetrics = await this.metricsStorage.getMetricsInTimeRange(
          currentData.machineId,
          since,
        );
        if (historicalMetrics.length > 0) {
          // Sort by timestamp ascending
          historicalMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          return historicalMetrics;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch historical metrics for ${currentData.machineId}: ${error.message}`);
      }
    }

    // For pod/PVC data, we store it in cluster info but not historically per-metric
    // Return just the current data point for now
    return [currentData];
  }

  private buildMessage(
    trigger: any,
    condition: ConditionConfig,
    targetId: string,
    actualValue: number | string | undefined,
  ): string {
    if (trigger.messageTemplate) {
      // User-defined template
      return this.conditionEvaluator.formatMessage(trigger.messageTemplate, {
        targetType: trigger.targetType,
        targetId,
        property: condition.property,
        value: actualValue,
        threshold: typeof condition.value === 'object'
          ? JSON.stringify(condition.value)
          : String(condition.value),
        conditionType: condition.conditionType,
      });
    }

    // Default message
    return this.conditionEvaluator.generateDefaultMessage(condition, targetId, actualValue);
  }
}