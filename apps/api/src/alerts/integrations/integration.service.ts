import { Injectable, Logger } from '@nestjs/common';
import { In } from 'typeorm';
import { AlertIntegration } from './integration.entity.js';
import { TriggerIntegration } from './trigger-integration.entity.js';
import { IntegrationChannel, IntegrationMessagePayload } from './integration-channel.interface.js';
import { createSlackChannel } from './channels/slack.channel.js';
import { createTeamsChannel } from './channels/teams.channel.js';
import { createDiscordChannel } from './channels/discord.channel.js';
import { createWebhookChannel } from './channels/webhook.channel.js';
import { CreateIntegrationDto, UpdateIntegrationDto } from '../dto/integration.dto.js';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  // === CRUD for integrations ===

  create(dto: CreateIntegrationDto) {
    const integration = AlertIntegration.create(dto);
    return integration.save();
  }

  async update(id: string, dto: UpdateIntegrationDto) {
    await AlertIntegration.update(id, dto);
    return AlertIntegration.findOneBy({ id });
  }

  delete(id: string) {
    return AlertIntegration.delete(id);
  }

  findAll() {
    return AlertIntegration.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return AlertIntegration.findOneBy({ id });
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
    const links = await TriggerIntegration.find({
      where: { triggerId },
    });
    return links.map(l => l.integrationId);
  }

  async getIntegrationsForTrigger(triggerId: string): Promise<AlertIntegration[]> {
    const integrationIds = await this.getTriggerIntegrationIds(triggerId);
    if (integrationIds.length === 0) return [];
    return AlertIntegration.find({
      where: { id: In(integrationIds) },
    });
  }

  // === Sending messages ===

  async getTargetIntegrations(triggerId: string): Promise<AlertIntegration[]> {
    const explicitIds = await this.getTriggerIntegrationIds(triggerId);
    const allIntegrations = await AlertIntegration.find({
      where: { enabled: true },
    });

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
    switch (integration.type) {
      case 'discord':
        return createDiscordChannel(integration.config.webhookUrl);
      case 'slack':
        return createSlackChannel(integration.config.webhookUrl);
      case 'teams':
        return createTeamsChannel(integration.config.webhookUrl);
      case 'webhook':
        return createWebhookChannel({
          url: integration.config.url,
          headers: integration.config.headers,
        });
      default:
        this.logger.warn(`Unknown integration type: ${integration.type}`);
        return null;
    }
  }
}