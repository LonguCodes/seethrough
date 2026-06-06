import { Injectable } from '@nestjs/common';

import type { IntegrationChannel, IntegrationMessagePayload } from '../integration-channel.interface.js';

@Injectable()
export class DiscordChannel implements IntegrationChannel {
  readonly type = 'discord';
  readonly label = 'Discord';

  webhookUrl?: string;

  async send(payload: IntegrationMessagePayload): Promise<void> {
    const webhookUrl = this.webhookUrl;
    if (!webhookUrl) return;

    const color = payload.severity === 'critical' ? 0xff0000
      : payload.severity === 'warning' ? 0xffa500
      : 0x3498db;

    const statusEmoji = payload.status === 'active' ? '🚨' : '✅';

    const embed = {
      title: `${statusEmoji} ${payload.title}`,
      description: payload.message,
      color,
      fields: [
        { name: 'Target', value: `${payload.targetType} \`${payload.targetId}\``, inline: true },
        { name: 'Property', value: payload.property, inline: true },
        { name: 'Value', value: String(payload.actualValue ?? 'N/A'), inline: true },
        { name: 'Severity', value: payload.severity, inline: true },
        { name: 'Trigger', value: payload.triggerName, inline: true },
      ],
      footer: {
        text: `Alert ID: ${payload.alertId}`,
      },
      timestamp: payload.timestamp,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
        ...(payload.status === 'resolved' ? { content: '✅ **Alert Resolved**' } : {}),
      }),
    });
  }
}

/**
 * Factory to create a DiscordChannel instance with a specific webhook URL.
 */
export function createDiscordChannel(webhookUrl: string): DiscordChannel {
  const channel = new DiscordChannel();
  channel.webhookUrl = webhookUrl;
  return channel;
}
