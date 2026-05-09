import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { ClusterService } from '../cluster/cluster.service.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { TriggerStrategy } from './strategies/trigger-strategy.interface.js';
import { AlertScope } from './alert.enums.js';
import { interval } from 'rxjs';
import { AlertTriggerData, PodData } from './strategies/scope-data.types.js';
import { TargetType } from './alert.enums.js';

@Injectable()
export class AlertProcessorService implements OnModuleInit {
  private readonly logger = new Logger(AlertProcessorService.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly clusterService: ClusterService,
    private readonly metricsService: MetricsService,
    @Inject('TRIGGER_STRATEGIES') private readonly strategies: TriggerStrategy[],
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

      if (triggers.length === 0) return;

      const latestMetrics = await this.metricsService.getLatestMetrics();
      const clusterInfo = await this.clusterService.getClusterInfo();

      for (const trigger of triggers) {
        const strategy = this.strategies.find(s => s.type === trigger.type);
        if (!strategy) {
          continue;
        }

        if (!strategy.supportedScopes.includes(trigger.scope)) {
          continue;
        }

        const targets = this.getTargetsForScope(strategy.targetType, trigger.scope, trigger.scopeValue, latestMetrics, clusterInfo);

        for (const target of targets) {
          if (strategy.evaluate(target.data, trigger.parameters)) {
            // Check if active alert already exists for this trigger and target
            const activeAlert = await this.alertsService.findActiveAlertForTriggerAndTarget(trigger.id, target.id);
            if (activeAlert) {
              continue;
            }

            await this.alertsService.createAlert({
              triggerId: trigger.id,
              triggerType: trigger.type,
              message: strategy.getMessage(target.data, trigger.parameters),
              details: {
                target: target.id,
                scope: trigger.scope,
                currentData: target.data,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing alerts: ${error.message}`);
    }
  }

  private getTargetsForScope(targetType: TargetType, scope: AlertScope, value: string | null = null, metrics: any[], cluster: any): { id: string, data: AlertTriggerData }[] {
    let baseData: { id: string, data: any }[] = [];

    // 1. Select base data by targetType
    switch (targetType) {
      case TargetType.NODE:
        baseData = metrics.map(m => ({ id: m.machineId, data: m }));
        break;

      case TargetType.POD:
        baseData = (cluster.pods || []).map((p: any) => ({ id: p.name, data: p }));
        break;

      case TargetType.PVC:
        baseData = (cluster.pvcs || []).map((p: any) => {
          let used = 0;
          for (const m of metrics) {
            const usage = (m.pvcUsage || []).find((u: any) => u.name === p.volumeName);
            if (usage) {
              used = usage.used;
              break;
            }
          }
          return { id: p.name, data: { ...p, used } };
        });
        break;
    }

    // 2. Filter by scope
    switch (scope) {
      case AlertScope.CLUSTER:
        return baseData;

      case AlertScope.NAMESPACE:
        return baseData.filter(item => item.data.namespace === value);

      case AlertScope.NODE:
      case AlertScope.POD:
      case AlertScope.PVC:
        return baseData.filter(item => item.id === value);

      default:
        return [];
    }
  }
}
