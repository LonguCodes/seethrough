import { Injectable } from '@nestjs/common';
import { IntegrationChannel, IntegrationMessagePayload } from '../integration-channel.interface.js';

@Injectable()
export class TeamsChannel implements IntegrationChannel {
  readonly type = 'teams';
  readonly label = 'Microsoft Teams';

  async send(payload: IntegrationMessagePayload): Promise<void> {
    const webhookUrl = (this as any).webhookUrl as string;
    if (!webhookUrl) return;

    const themeColor = payload.severity === 'critical' ? 'ff0000'
      : payload.severity === 'warning' ? 'ffa500'
      : '3498db';

    const statusLabel = payload.status === 'active' ? '🚨 Alert Fired' : '✅ Alert Resolved';

    const card = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor,
      summary: payload.title,
      sections: [
        {
          activityTitle: `**${statusLabel}**`,
          text: payload.message,
          facts: [
            { name: 'Target', value: `${payload.targetType} \`${payload.targetId}\`` },
            { name: 'Property', value: payload.property },
            { name: 'Value', value: String(payload.actualValue ?? 'N/A') },
            { name: 'Severity', value: payload.severity },
            { name: 'Trigger', value: payload.triggerName },
            { name: 'Time', value: new Date(payload.timestamp).toLocaleString() },
          ],
          markdown: true,
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  }
}

export function createTeamsChannel(webhookUrl: string): TeamsChannel {
  const channel = new TeamsChannel();
  (channel as any).webhookUrl = webhookUrl;
  return channel;
}