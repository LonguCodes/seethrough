import { Injectable, Logger } from '@nestjs/common';

import { createDiscordChannel } from './channels/discord.channel.js';
import { createSlackChannel } from './channels/slack.channel.js';
import { createTeamsChannel } from './channels/teams.channel.js';
import { createWebhookChannel } from './channels/webhook.channel.js';
import type { IntegrationChannel, IntegrationMessagePayload } from './integration-channel.interface.js';
import { AlertIntegration } from './integration.entity.js';
import { TriggerIntegration } from './trigger-integration.entity.js';
import  { CreateIntegrationDto, UpdateIntegrationDto } from '../dto/integration.dto.js';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  // === CRUD for integrations === 

  create(dto: CreateIntegrationDto) {
    const integration = AlertIntegration.create({...dto});
    return integration.save();
  }

  async update(id: string, dto: UpdateIntegrationDto) {
    await AlertIntegration.update(id, dto);
    return AlertIntegration.createQueryBuilder('integration')
      .where('integration.id = :id', { id })
      .getOne();
  }

  delete(id: string) {
    return AlertIntegration.delete(id);
  }

  findAll() {
    return AlertIntegration.createQueryBuilder('integration')
      .orderBy('integration.createdAt', 'DESC')
      .getMany();
  }

  findOne(id: string) {
    return AlertIntegration.createQueryBuilder('integration')
      .where('integration.id = :id', { id })
      .getOne();
  }

  // === Linking triggers to integrations ===

  async setTriggerIntegrations(triggerId: string, integrationIds: string[]) {
    await TriggerIntegration.delete({ triggerId });

    if (integrationIds.length > 0) {
      const links = integrationIds.map(id =>
        TriggerIntegration.create({ triggerId, integrationId: id }),
      );
      await TriggerIntegration.save(links);
    }
  }

  async getTriggerIntegrationIds(triggerId: string): Promise<string[]> {
    const links = await TriggerIntegration.createQueryBuilder('triggerIntegration')
      .where('triggerIntegration.triggerId = :triggerId', { triggerId })
      .getMany();
    return links.map(l => l.integrationId);
  }

  async getIntegrationsForTrigger(triggerId: string): Promise<AlertIntegration[]> {
    const integrationIds = await this.getTriggerIntegrationIds(triggerId);
    if (integrationIds.length === 0) return [];
    return AlertIntegration.createQueryBuilder('integration')
      .where('integration.id IN (:...integrationIds)', { integrationIds })
      .getMany();
  }

  // === Sending messages ===

  async getTargetIntegrations(triggerId: string): Promise<AlertIntegration[]> {
    const explicitIds = await this.getTriggerIntegrationIds(triggerId);
    const allIntegrations = await AlertIntegration.createQueryBuilder('integration')
      .where('integration.enabled = :enabled', { enabled: true })
      .getMany();

    return allIntegrations.filter(i =>
      i.sendAllAlerts || explicitIds.includes(i.id),
    );
  }

  async sendAlert(
    payload: IntegrationMessagePayload,
    triggerId: string,
  ): Promise<void> {
    const integrations = await this.getTargetIntegrations(triggerId);

    for (const integration of integrations) {
      try {
        const channel = this.buildChannel(integration);
        if (channel) {
          await channel.send(payload);
          this.logger.debug(`Sent alert to integration "${integration.name}" (${integration.type})`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to send alert to integration "${integration.name}": ${error.message}`,
        );
      }
    }
  }

  private buildChannel(integration: AlertIntegration): IntegrationChannel | null {
    const cfg = integration.config as Record<string, string>;
    switch (integration.type) {
      case 'discord':
        return createDiscordChannel(cfg.webhookUrl);
      case 'slack':
        return createSlackChannel(cfg.webhookUrl);
      case 'teams':
        return createTeamsChannel(cfg.webhookUrl);
      case 'webhook':
        return createWebhookChannel({
          url: cfg.url,
          headers: cfg.headers ? (cfg.headers as unknown as Record<string, string>) : undefined,
        });
      default:
        this.logger.warn(`Unknown integration type: ${integration.type}`);
        return null;
    }
  }
}