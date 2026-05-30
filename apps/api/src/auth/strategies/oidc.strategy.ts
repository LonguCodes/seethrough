import { Injectable } from '@nestjs/common';
import { SsoConfig } from '../entities/sso-config.entity.js';
import { User } from '../entities/user.entity.js';
import { SsoLoginStrategy } from './sso-login-strategy.interface.js';
import type { SsoIdentity } from '../auth.service.types.js';

@Injectable()
export class OidcStrategy implements SsoLoginStrategy {
  name = 'oidc';

  async authenticate(
    config: SsoConfig,
    identity: SsoIdentity,
  ): Promise<{ user: User | null; error?: string }> {
    const { externalId, email, attributes } = identity;

    const username = email || externalId || attributes?.preferred_username || attributes?.sub;
    if (!username) {
      return { user: null, error: 'No identifiable user attribute received from OIDC provider' };
    }

    let user = await User.findOneBy({ username });

    if (!user) {
      if (!config.autoCreateUsers) {
        return { user: null, error: 'User does not exist and auto-creation is disabled for this SSO configuration' };
      }

      user = User.create({
        username,
        password: '', // SSO users have no local password
        role: config.defaultRole || 'viewer',
      });
      await user.save();
    }

    return { user };
  }

  getAuthorizationUrl(config: SsoConfig, state: string): string {
    const issuerUrl = config.oidcIssuerUrl!.replace(/\/$/, '');
    const clientId = config.oidcClientId!;
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/auth/sso/oidc/callback/${config.id}`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
    });

    return `${issuerUrl}/authorize?${params.toString()}`;
  }

  /**
   * Exchange the authorization code for tokens and extract identity claims.
   * In a full implementation this would use openid-client.
   */
  async handleCallback(
    config: SsoConfig,
    code: string,
  ): Promise<SsoIdentity> {
    const issuerUrl = config.oidcIssuerUrl!.replace(/\/$/, '');
    const clientId = config.oidcClientId!;
    const clientSecret = config.oidcClientSecret!;
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/auth/sso/oidc/callback/${config.id}`;

    // Exchange code for token
    const tokenResponse = await fetch(`${issuerUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange OIDC authorization code');
    }

    const tokens: any = await tokenResponse.json();

    // Decode ID token or fetch userinfo
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