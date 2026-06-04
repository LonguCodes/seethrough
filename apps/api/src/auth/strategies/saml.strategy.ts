import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity.js';
import { AuthMethod } from '../entities/auth-method.entity.js';
import { LoginStrategy } from './login-strategy.interface.js';
import type { SamlAuthSettings } from '../types/auth-method-settings.types.js';

export interface SamlIdentity {
  externalId?: string;
  email?: string;
  attributes?: Record<string, any>;
}

@Injectable()
export class SamlStrategy implements LoginStrategy {
  name = 'saml';

  async authenticate(config: AuthMethod, credentials: Record<string, any>): Promise<User | null> {
    // SAML requires redirect flow, not direct credential auth
    return null;
  }

  getStartUrl(config: AuthMethod, redirectUri: string, state: string): string {
    const settings = config.settings as unknown as SamlAuthSettings;
    const entryPoint = settings.entryPoint || '';
    const separator = entryPoint.includes('?') ? '&' : '?';
    return `${entryPoint}${separator}RelayState=${encodeURIComponent(state)}`;
  }

  async handleCallback(config: AuthMethod, params: Record<string, any>): Promise<SamlIdentity> {
    return {
      externalId: params.nameid || params.subject,
      email: params.email,
      attributes: params,
    };
  }
}