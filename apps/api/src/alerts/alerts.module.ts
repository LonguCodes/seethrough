import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { AlertsController } from './alerts.controller.js';
import { AlertProcessorService } from './alert-processor.service.js';
import { ClusterModule } from '../cluster/cluster.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { NodeTarget } from './targets/node.target.js';
import { PodTarget } from './targets/pod.target.js';
import { PvcTarget } from './targets/pvc.target.js';
import { DeploymentTarget } from './targets/deployment.target.js';
import { StatefulSetTarget } from './targets/statefulset.target.js';
import { DaemonSetTarget } from './targets/daemonset.target.js';
import { TargetRegistry } from './targets/target.registry.js';
import { ConditionEvaluator } from './evaluators/condition-evaluator.service.js';
import { IntegrationService } from './integrations/integration.service.js';

@Module({
  imports: [
    ClusterModule,
    MetricsModule,
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