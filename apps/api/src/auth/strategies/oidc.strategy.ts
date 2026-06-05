import { Injectable } from '@nestjs/common';

import type { LoginStrategy } from './login-strategy.interface.js';
import type { AuthMethod } from '../entities/auth-method.entity.js';
import type { User } from '../entities/user.entity.js';
import type { OidcAuthSettings } from '../types/auth-method-settings.types.js';

export interface OidcIdentity {
  externalId?: string;
  email?: string;
  attributes?: Record<string, any>;
}

@Injectable()
export class OidcStrategy implements LoginStrategy {
  name = 'oidc';

  async authenticate(config: AuthMethod, credentials: Record<string, any>): Promise<User | null> {
    // OIDC requires redirect flow, not direct credential auth
    return null;
  }

  getStartUrl(config: AuthMethod, redirectUri: string, state: string): string {
    const settings = config.settings as unknown as OidcAuthSettings;
    const issuerUrl = (settings.issuerUrl || '').replace(/\/$/, '');
    const clientId = settings.clientId || '';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: (settings.scopes || ['openid', 'profile', 'email']).join(' '),
      state,
    });

    return `${issuerUrl}/authorize?${params.toString()}`;
  }

  async handleCallback(config: AuthMethod, params: Record<string, any>): Promise<OidcIdentity> {
    const settings = config.settings as unknown as OidcAuthSettings;
    const issuerUrl = (settings.issuerUrl || '').replace(/\/$/, '');
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/auth/callback/${config.id}`;

    const tokenResponse = await fetch(`${issuerUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: redirectUri,
        client_id: settings.clientId || '',
        client_secret: settings.clientSecret || '',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange OIDC authorization code');
    }

    const tokens: any = await tokenResponse.json();
    let userinfo: any = {};

    if (tokens.access_token) {
      const userinfoResponse = await fetch(`${issuerUrl}/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userinfoResponse.ok) {
        userinfo = await userinfoResponse.json();
      }
    }

    return {
      externalId: userinfo.sub || tokens.sub,
      email: userinfo.email,
      attributes: userinfo,
    };
  }
}