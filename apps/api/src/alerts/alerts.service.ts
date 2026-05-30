import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { AlertTrigger } from './alert-trigger.entity.js';
import { Alert } from './alert.entity.js';
import { AlertStatus } from './alert.enums.js';
import { CreateTriggerDto, UpdateTriggerDto } from './dto/create-trigger.dto.js';
import { TargetRegistry } from './targets/target.registry.js';
import {shake} from "radash";

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertTrigger)
    private readonly alertTriggerRepository: Repository<AlertTrigger>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly targetRegistry: TargetRegistry,
  ) { }

  // Trigger Methods
  createTrigger(dto: CreateTriggerDto) {
    const trigger = this.alertTriggerRepository.create({
      name: dto.name,
      scope: dto.scope,
      scopeValue: dto.scopeValue,
      targetType: dto.targetType,
      targetProperty: dto.targetProperty,
      conditionType: dto.conditionType,
      conditionValue: dto.conditionValue,
      messageTemplate: dto.messageTemplate,
      enabled: dto.enabled ?? true,
      lookbackSeconds: dto.lookbackSeconds ?? 0,
      autoResolveEnabled: dto.autoResolveEnabled ?? true,
      autoResolveLookbackSeconds: dto.autoResolveLookbackSeconds ?? 0,
      noRetriggerSeconds: dto.noRetriggerSeconds ?? 0,
    });
    return this.alertTriggerRepository.save(trigger);
  }

  async updateTrigger(id: string, dto: UpdateTriggerDto) {
    const trigger = await this.alertTriggerRepository.findOneBy({ id });
    if (!trigger) {
      throw new NotFoundException('Trigger not found');
    }

    Object.assign(trigger, shake(dto))

    return this.alertTriggerRepository.save(trigger);
  }

  deleteTrigger(id: string) {
    return this.alertTriggerRepository.delete(id);
  }

  findAllTriggers() {
    return this.alertTriggerRepository.find();
  }

  findOneTrigger(id: string) {
    return this.alertTriggerRepository.findOneBy({ id });
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

  async findActiveAlertForTriggerAndTarget(triggerId: string, target: string): Promise<Alert | null> {
    return this.alertRepository.createQueryBuilder('alert')
      .where('alert.triggerId = :triggerId', { triggerId })
      .andWhere('alert.status = :status', { status: AlertStatus.ACTIVE })
      .andWhere("alert.details->>'target' = :target", { target })
      .getOne();
  }

  async findActiveAlerts(): Promise<Alert[]> {
    return this.alertRepository.find({
      where: { status: AlertStatus.ACTIVE },
      relations: ['trigger'],
    });
  }

  async findActiveAlertsForTrigger(triggerId: string): Promise<Alert[]> {
    return this.alertRepository.find({
      where: {
        triggerId,
        status: AlertStatus.ACTIVE,
      },
    });
  }

  async resolveAlert(id: string, autoResolved = false) {
    await this.alertRepository.update(id, {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
      autoResolved,
    });
    return this.alertRepository.findOneBy({ id });
  }

  async updateLastMatchedAt(id: string) {
    await this.alertRepository.update(id, {
      lastMatchedAt: new Date(),
    });
  }

  async updateTriggerLastTriggeredAt(triggerId: string) {
    await this.alertTriggerRepository.update(triggerId, {
      lastTriggeredAt: new Date(),
    });
  }

  getTargetSchemas() {
    return this.targetRegistry.getAllTargetSchemas();
  }
}