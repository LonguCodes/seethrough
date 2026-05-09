import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertTrigger } from './alert-trigger.entity.js';
import { Alert } from './alert.entity.js';
import { AlertStatus } from './alert.enums.js';
import { Inject } from '@nestjs/common';
import { TriggerStrategy } from './strategies/trigger-strategy.interface.js';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertTrigger)
    private readonly alertTriggerRepository: Repository<AlertTrigger>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @Inject('TRIGGER_STRATEGIES') private readonly strategies: TriggerStrategy[],
  ) { }

  // Trigger Methods
  createTrigger(data: Partial<AlertTrigger>) {
    const trigger = this.alertTriggerRepository.create(data);
    return this.alertTriggerRepository.save(trigger);
  }

  async updateTrigger(id: string, data: Partial<AlertTrigger>) {
    await this.alertTriggerRepository.update(id, data);
    return this.alertTriggerRepository.findOneBy({ id });
  }

  deleteTrigger(id: string) {
    return this.alertTriggerRepository.delete(id);
  }

  findAllTriggers() {
    return this.alertTriggerRepository.find();
  }

  findEnabledTriggers() {
    return this.alertTriggerRepository.find({ where: { enabled: true } });
  }

  // Alert Instance Methods
  createAlert(data: Partial<Alert>) {
    const alert = this.alertRepository.create(data);
    return this.alertRepository.save(alert);
  }

  findAllAlerts(status?: AlertStatus, target?: string) {
    const query = this.alertRepository.createQueryBuilder('alert');

    if (status) {
      query.andWhere('alert.status = :status', { status });
    }

    if (target) {
      query.andWhere("alert.details->>'target' = :target", { target });
    }

    query.orderBy('alert.createdAt', 'DESC');

    return query.getMany();
  }

  async findActiveAlertForTriggerAndTarget(triggerId: string, target: string) {
    return this.alertRepository.createQueryBuilder('alert')
      .where('alert.triggerId = :triggerId', { triggerId })
      .andWhere('alert.status = :status', { status: AlertStatus.ACTIVE })
      .andWhere("alert.details->>'target' = :target", { target })
      .getOne();
  }

  async resolveAlert(id: string) {
    await this.alertRepository.update(id, {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date()
    });
    return this.alertRepository.findOneBy({ id });
  }

  // ... (keeping other trigger methods if needed, but the user asked for Alert focus)
  findOneTrigger(id: string) {
    return this.alertTriggerRepository.findOneBy({ id });
  }

  getStrategies() {
    return this.strategies.map(s => ({
      type: s.type,
      targetType: s.targetType,
      supportedScopes: s.supportedScopes,
      requiredParameters: s.requiredParameters,
      unit: s.unit,
    }));
  }
}
