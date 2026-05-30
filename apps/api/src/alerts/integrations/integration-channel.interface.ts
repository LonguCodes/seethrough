import { Alert } from '../alert.entity.js';
import { AlertTrigger } from '../alert-trigger.entity.js';

export interface IntegrationMessagePayload {
  title: string;
  message: string;
  severity: string;
  status: 'active' | 'resolved';
  targetType: string;
  targetId: string;
  property: string;
  actualValue: number | string | undefined;
  triggerName: string;
  timestamp: string;
  alertId: string;
}

export interface IntegrationChannel {
  readonly type: string;
  readonly label: string;

  /**
   * Send a message about an alert to this integration.
   * Called for both new alerts and auto-resolved alerts.
   */
  send(payload: IntegrationMessagePayload): Promise<void>;
}