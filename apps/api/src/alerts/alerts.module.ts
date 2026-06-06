import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Alert } from './alert.entity.js';
import { AlertTrigger } from './alert-trigger.entity.js';
import { AlertIntegration } from './integrations/integration.entity.js';
import { TriggerIntegration } from './integrations/trigger-integration.entity.js';
import { AlertProcessorService } from './alert-processor.service.js';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';
import { ClusterModule } from '../cluster/cluster.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { ConditionEvaluator } from './evaluators/condition-evaluator.service.js';
import { IntegrationService } from './integrations/integration.service.js';
import { DaemonSetTarget } from './targets/daemonset.target.js';
import { DeploymentTarget } from './targets/deployment.target.js';
import { NodeTarget } from './targets/node.target.js';
import { PodTarget } from './targets/pod.target.js';
import { PvcTarget } from './targets/pvc.target.js';
import { StatefulSetTarget } from './targets/statefulset.target.js';
import { TargetRegistry } from './targets/target.registry.js';

@Module({
  imports: [
    ClusterModule,
    MetricsModule,
    TypeOrmModule.forFeature([Alert, AlertTrigger, AlertIntegration, TriggerIntegration]),
  ],
  providers: [
    AlertsService,
    AlertProcessorService,
    NodeTarget,
    PodTarget,
    PvcTarget,
    DeploymentTarget,
    StatefulSetTarget,
    DaemonSetTarget,
    ConditionEvaluator,
    IntegrationService,
    {
      provide: TargetRegistry,
      useFactory: (nodeTarget: NodeTarget, podTarget: PodTarget, pvcTarget: PvcTarget, deploymentTarget: DeploymentTarget, statefulSetTarget: StatefulSetTarget, daemonSetTarget: DaemonSetTarget) => {
        return new TargetRegistry([nodeTarget, podTarget, pvcTarget, deploymentTarget, statefulSetTarget, daemonSetTarget]);
      },
      inject: [NodeTarget, PodTarget, PvcTarget, DeploymentTarget, StatefulSetTarget, DaemonSetTarget],
    },
  ],
  controllers: [AlertsController],
  exports: [AlertsService, IntegrationService],
})
export class AlertsModule { }