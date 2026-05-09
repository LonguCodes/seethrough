import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service.js';
import { AlertsController } from './alerts.controller.js';
import { AlertTrigger } from './alert-trigger.entity.js';
import { Alert } from './alert.entity.js';
import { CpuThresholdStrategy } from './strategies/cpu-threshold.strategy.js';
import { PodErrorStatusStrategy } from './strategies/pod-error-status.strategy.js';
import { PvcStatusStrategy } from './strategies/pvc-status.strategy.js';
import { PvcUsageStrategy } from './strategies/pvc-threshold.strategy.js';
import { AlertProcessorService } from './alert-processor.service.js';
import { ClusterModule } from '../cluster/cluster.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertTrigger, Alert]),
    ClusterModule,
    MetricsModule,
  ],
  providers: [
    AlertsService,
    AlertProcessorService,
    CpuThresholdStrategy,
    PodErrorStatusStrategy,
    PvcStatusStrategy,
    PvcUsageStrategy,
    {
      provide: 'TRIGGER_STRATEGIES',
      useFactory: (cpu: CpuThresholdStrategy, podError: PodErrorStatusStrategy, pvcStatus: PvcStatusStrategy, pvcThreshold: PvcUsageStrategy) => [cpu, podError, pvcStatus, pvcThreshold],
      inject: [CpuThresholdStrategy, PodErrorStatusStrategy, PvcStatusStrategy, PvcUsageStrategy],
    },
  ],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule { }
