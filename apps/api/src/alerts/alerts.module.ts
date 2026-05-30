import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service.js';
import { AlertsController } from './alerts.controller.js';
import { AlertTrigger } from './alert-trigger.entity.js';
import { Alert } from './alert.entity.js';
import { AlertProcessorService } from './alert-processor.service.js';
import { ClusterModule } from '../cluster/cluster.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { NodeTarget } from './targets/node.target.js';
import { PodTarget } from './targets/pod.target.js';
import { PvcTarget } from './targets/pvc.target.js';
import { TargetRegistry } from './targets/target.registry.js';
import { ConditionEvaluator } from './evaluators/condition-evaluator.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertTrigger, Alert]),
    ClusterModule,
    MetricsModule,
  ],
  providers: [
    AlertsService,
    AlertProcessorService,
    NodeTarget,
    PodTarget,
    PvcTarget,
    ConditionEvaluator,
    {
      provide: TargetRegistry,
      useFactory: (nodeTarget: NodeTarget, podTarget: PodTarget, pvcTarget: PvcTarget) => {
        return new TargetRegistry([nodeTarget, podTarget, pvcTarget]);
      },
      inject: [NodeTarget, PodTarget, PvcTarget],
    },
  ],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule { }