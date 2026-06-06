import { Injectable } from '@nestjs/common';

import type { IntegrationChannel, IntegrationMessagePayload } from '../integration-channel.interface.js';

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
}

@Injectable()
export class WebhookChannel implements IntegrationChannel {
  readonly type = 'webhook';
  readonly label = 'Webhook';

  webhookConfig?: WebhookConfig;

  async send(payload: IntegrationMessagePayload): Promise<void> {
    const webhookConfig = this.webhookConfig;
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

export function createWebhookChannel(config: WebhookConfig): WebhookChannel {
  const channel = new WebhookChannel();
  channel.webhookConfig = config;
  return channel;
}
