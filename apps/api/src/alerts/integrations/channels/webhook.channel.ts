import { Injectable } from '@nestjs/common';
import { IntegrationChannel, IntegrationMessagePayload } from '../integration-channel.interface.js';

@Injectable()
export class WebhookChannel implements IntegrationChannel {
  readonly type = 'webhook';
  readonly label = 'Webhook';

  async send(payload: IntegrationMessagePayload): Promise<void> {
    const webhookConfig = (this as any).webhookConfig as { url: string; headers?: Record<string, string> } | undefined;
    if (!webhookConfig?.url) return;

    const body = {
      event: payload.status === 'active' ? 'alert.fired' : 'alert.resolved',
      alert: {
        id: payload.alertId,
        title: payload.title,
        message: payload.message,
        severity: payload.severity,
        status: payload.status,
        target: {
          type: payload.targetType,
          id: payload.targetId,
        },
        property: payload.property,
        actualValue: payload.actualValue,
        triggerName: payload.triggerName,
        timestamp: payload.timestamp,
      },
    };

    await fetch(webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookConfig.headers || {}),
      },
      body: JSON.stringify(body),
    });
  }
}

export function createWebhookChannel(config: { url: string; headers?: Record<string, string> }): WebhookChannel {
  const channel = new WebhookChannel();
  (channel as any).webhookConfig = config;
  return channel;
}