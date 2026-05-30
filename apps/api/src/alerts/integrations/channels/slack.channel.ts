import { Injectable } from '@nestjs/common';
import { IntegrationChannel, IntegrationMessagePayload } from '../integration-channel.interface.js';

@Injectable()
export class SlackChannel implements IntegrationChannel {
  readonly type = 'slack';
  readonly label = 'Slack';

  async send(payload: IntegrationMessagePayload): Promise<void> {
    const webhookUrl = (this as any).webhookUrl as string;
    if (!webhookUrl) return;

    const color = payload.severity === 'critical' ? '#ff0000'
      : payload.severity === 'warning' ? '#ffa500'
      : '#3498db';

    const statusEmoji = payload.status === 'active' ? ':warning:' : ':white_check_mark:';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} ${payload.title}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Target:* ${payload.targetType} \`${payload.targetId}\`` },
          { type: 'mrkdwn', text: `*Property:* ${payload.property}` },
          { type: 'mrkdwn', text: `*Value:* ${payload.actualValue ?? 'N/A'}` },
          { type: 'mrkdwn', text: `*Severity:* ${payload.severity}` },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Trigger: *${payload.triggerName}* | ${new Date(payload.timestamp).toLocaleString()}`,
          },
        ],
      },
    ];

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            blocks,
            ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
          },
        ],
      }),
    });
  }
}

/**
 * Factory to create a SlackChannel instance with a specific webhook URL.
 */
export function createSlackChannel(webhookUrl: string): SlackChannel {
  const channel = new SlackChannel();
  (channel as any).webhookUrl = webhookUrl;
  return channel;
}