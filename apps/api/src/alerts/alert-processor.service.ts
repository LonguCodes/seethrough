import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { interval } from 'rxjs';

import { AlertScope , AlertStatus } from './alert.enums.js';
import type { AlertsService } from './alerts.service.js';
import type { ClusterService } from '../cluster/cluster.service.js';
import type { MetricsService } from '../metrics/metrics.service.js';
import type { ConditionEvaluator, ConditionConfig } from './evaluators/condition-evaluator.service.js';
import type { IntegrationService } from './integrations/integration.service.js';
import type { NodeMetricData, ClusterInfoData, TargetItem } from './targets/target-data.types.js';
import type { TargetRegistry } from './targets/target.registry.js';
import { METRICS_STORAGE_TOKEN } from '../metrics/strategies/metrics-storage.interface.js';
import type { IMetricsStorage } from '../metrics/strategies/metrics-storage.interface.js';

@Injectable()
export class AlertProcessorService implements OnModuleInit {
  private readonly logger = new Logger(AlertProcessorService.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly clusterService: ClusterService,
    private readonly metricsService: MetricsService,
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly targetRegistry: TargetRegistry,
    private readonly integrationService: IntegrationService,
    @Inject(METRICS_STORAGE_TOKEN) private readonly metricsStorage: IMetricsStorage,
  ) { }

  onModuleInit() {
    this.logger.log('Alert Processor Service started');
    interval(30000).subscribe(() => this.processAlerts());
  }

  async processAlerts() {
    this.logger.debug('Processing alerts...');
    try {
      const triggers = await this.alertsService.findEnabledTriggers();

      if (triggers.length === 0) {
        await this.processAutoResolve();
        return;
      }

      const latestMetrics = await this.metricsService.getLatestMetrics();
      const clusterInfo = await this.clusterService.getClusterInfo();

      for (const trigger of triggers) {
        await this.processTrigger(trigger, latestMetrics, clusterInfo);
      }

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

    if (trigger.noRetriggerSeconds > 0 && trigger.lastTriggeredAt) {
      const cooldownEnd = new Date(trigger.lastTriggeredAt.getTime() + trigger.noRetriggerSeconds * 1000);
      if (new Date() < cooldownEnd) {
        this.logger.debug(`Trigger ${trigger.id} is in cooldown period, skipping`);
        return;
      }
    }

    const targets = target.getTargets(trigger.scope, trigger.scopeValue, latestMetrics, clusterInfo);

    const condition: ConditionConfig = {
      targetType: trigger.targetType,
      property: trigger.targetProperty,
      conditionType: trigger.conditionType,
      value: trigger.conditionValue,
    };

    for (const targetItem of targets) {
      await this.evaluateTarget(trigger, condition, targetItem);
    }
  }

  private async evaluateTarget(trigger: any, condition: ConditionConfig, targetItem: { id: string; data: any }) {
    try {
      const dataPoints = await this.getDataPoints(targetItem.data, trigger);
      const result = this.conditionEvaluator.evaluateMultiple(dataPoints, condition);

      if (result.matched) {
        const activeAlert = await this.alertsService.findActiveAlertForTriggerAndTarget(
          trigger.id,
          targetItem.id,
        );

        if (activeAlert) {
          await this.alertsService.updateLastMatchedAt(activeAlert.id);
        } else {
          const message = this.buildMessage(trigger, condition, targetItem.id, result.actualValue);
          const alert = await this.alertsService.createAlert({
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

          await this.alertsService.updateTriggerLastTriggeredAt(trigger.id);
          this.logger.log(`Alert created for trigger "${trigger.name}" on ${targetItem.id}`);

          // Send to integrations
          await this.integrationService.sendAlert(
            {
              title: `Alert: ${trigger.name}`,
              message,
              severity: 'warning',
              status: 'active',
              targetType: trigger.targetType,
              targetId: targetItem.id,
              property: condition.property,
              actualValue: result.actualValue,
              triggerName: trigger.name,
              timestamp: alert.createdAt.toISOString(),
              alertId: alert.id,
            },
            trigger.id,
          );
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

      const resolveLookbackSeconds = trigger.autoResolveLookbackSeconds > 0
        ? trigger.autoResolveLookbackSeconds
        : trigger.lookbackSeconds;

      const dataPoints = await this.getDataPoints(targetItem.data, {
        ...trigger,
        lookbackSeconds: resolveLookbackSeconds,
      });

      const result = this.conditionEvaluator.evaluateMultiple(dataPoints, condition);

      if (!result.matched) {
        await this.alertsService.resolveAlert(alert.id, true);
        this.logger.log(`Alert ${alert.id} auto-resolved as condition no longer matches`);

        // Send resolution to integrations
        await this.integrationService.sendAlert(
          {
            title: `Resolved: ${trigger.name}`,
            message: alert.message,
            severity: 'info',
            status: 'resolved',
            targetType: trigger.targetType,
            targetId: alert.details?.target || '',
            property: condition.property,
            actualValue: result.actualValue,
            triggerName: trigger.name,
            timestamp: new Date().toISOString(),
            alertId: alert.id,
          },
          trigger.id,
        );
      }
    } catch (error) {
      this.logger.error(`Error evaluating auto-resolve for alert ${alert.id}: ${error.message}`);
    }
  }

  private async getDataPoints(currentData: any, trigger: any): Promise<any[]> {
    const lookbackMs = trigger.lookbackSeconds * 1000;

    if (lookbackMs === 0) {
      return [currentData];
    }

    if (currentData.machineId && trigger.targetType === 'Node') {
      const since = new Date(Date.now() - lookbackMs);
      try {
        const historicalMetrics = await this.metricsStorage.getMetricsInTimeRange(
          currentData.machineId,
          since,
        );
        if (historicalMetrics.length > 0) {
          historicalMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          return historicalMetrics;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch historical metrics for ${currentData.machineId}: ${error.message}`);
      }
    }

    return [currentData];
  }

  private buildMessage(
    trigger: any,
    condition: ConditionConfig,
    targetId: string,
    actualValue: number | string | undefined,
  ): string {
    if (trigger.messageTemplate) {
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

    return this.conditionEvaluator.generateDefaultMessage(condition, targetId, actualValue);
  }
}