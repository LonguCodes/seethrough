import { Injectable, NotFoundException } from '@nestjs/common';
import { shake } from "radash";

import { AlertTrigger } from './alert-trigger.entity.js';
import { Alert } from './alert.entity.js';
import { AlertStatus } from './alert.enums.js';
import type { CreateTriggerDto, UpdateTriggerDto } from './dto/create-trigger.dto.js';
import type { IntegrationService } from './integrations/integration.service.js';
import type { TargetRegistry } from './targets/target.registry.js';

@Injectable()
export class AlertsService {
  constructor(
    private readonly targetRegistry: TargetRegistry,
    private readonly integrationService: IntegrationService,
  ) { }

  // Trigger Methods
  async createTrigger(dto: CreateTriggerDto) {
    const { integrationIds, ...triggerData } = dto;
    const trigger = AlertTrigger.create({
      name: triggerData.name,
      scope: triggerData.scope,
      scopeValue: triggerData.scopeValue,
      targetType: triggerData.targetType,
      targetProperty: triggerData.targetProperty,
      conditionType: triggerData.conditionType,
      conditionValue: triggerData.conditionValue,
      messageTemplate: triggerData.messageTemplate,
      enabled: triggerData.enabled ?? true,
      lookbackSeconds: triggerData.lookbackSeconds ?? 0,
      autoResolveEnabled: triggerData.autoResolveEnabled ?? true,
      autoResolveLookbackSeconds: triggerData.autoResolveLookbackSeconds ?? 0,
      noRetriggerSeconds: triggerData.noRetriggerSeconds ?? 0,
    });
    await trigger.save();

    if (integrationIds?.length) {
      await this.integrationService.setTriggerIntegrations(trigger.id, integrationIds);
    }

    return this.findOneTrigger(trigger.id);
  }

  async updateTrigger(id: string, dto: UpdateTriggerDto) {
    const trigger = await AlertTrigger.createQueryBuilder('trigger')
      .where('trigger.id = :id', { id })
      .getOne();
    if (!trigger) {
      throw new NotFoundException('Trigger not found');
    }

    const { integrationIds, ...triggerData } = dto;
    Object.assign(trigger, shake(triggerData));
    await trigger.save();

    if (integrationIds !== undefined) {
      await this.integrationService.setTriggerIntegrations(id, integrationIds);
    }

    return this.findOneTrigger(id);
  }

  async findOneTrigger(id: string) {
    const trigger = await AlertTrigger.createQueryBuilder('trigger')
      .where('trigger.id = :id', { id })
      .getOne();
    if (!trigger) return null;

    const integrationIds = await this.integrationService.getTriggerIntegrationIds(id);
    return { ...trigger, integrationIds };
  }

  async findAllTriggers() {
    const triggers = await AlertTrigger.createQueryBuilder('trigger').getMany();
    return Promise.all(
      triggers.map(async (t) => ({
        ...t,
        integrationIds: await this.integrationService.getTriggerIntegrationIds(t.id),
      })),
    );
  }

  deleteTrigger(id: string) {
    return AlertTrigger.delete(id);
  }

  findEnabledTriggers() {
    return AlertTrigger.createQueryBuilder('trigger')
      .where('trigger.enabled = :enabled', { enabled: true })
      .getMany();
  }

  // Alert Instance Methods
  async createAlert(data: Partial<Alert>) {
    const alert = Alert.create(data);
    return alert.save();
  }

  findAllAlerts(status?: AlertStatus, target?: string) {
    const query = Alert.createQueryBuilder('alert');

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
    return Alert.createQueryBuilder('alert')
      .where('alert.triggerId = :triggerId', { triggerId })
      .andWhere('alert.status = :status', { status: AlertStatus.ACTIVE })
      .andWhere("alert.details->>'target' = :target", { target })
      .getOne();
  }

  async findActiveAlerts(): Promise<Alert[]> {
    return Alert.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.trigger', 'trigger')
      .where('alert.status = :status', { status: AlertStatus.ACTIVE })
      .getMany();
  }

  async resolveAlert(id: string, autoResolved = false) {
    await Alert.update(id, {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
      autoResolved,
    });
    return Alert.createQueryBuilder('alert')
      .where('alert.id = :id', { id })
      .getOne();
  }

  async updateLastMatchedAt(id: string) {
    await Alert.update(id, {
      lastMatchedAt: new Date(),
    });
  }

  async updateTriggerLastTriggeredAt(triggerId: string) {
    await AlertTrigger.update(triggerId, {
      lastTriggeredAt: new Date(),
    });
  }

  getTargetSchemas() {
    return this.targetRegistry.getAllTargetSchemas();
  }
}