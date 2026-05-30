import { Injectable } from '@nestjs/common';
import { SsoConfig } from '../entities/sso-config.entity.js';
import { User } from '../entities/user.entity.js';
import { SsoLoginStrategy } from './sso-login-strategy.interface.js';
import type { SsoIdentity } from '../auth.service.types.js';

@Injectable()
export class SamlStrategy implements SsoLoginStrategy {
  name = 'saml';

  /**
   * Given an SSO config and the SAML response attributes,
   * looks up or creates the user.
   */
  async authenticate(
    config: SsoConfig,
    identity: SsoIdentity,
  ): Promise<{ user: User | null; error?: string }> {
    const { externalId, email, attributes } = identity;

    // Try to find user by a linked identity — for now we use email match
    // A real implementation would use a separate identity linking table
    const username = email || externalId || attributes?.username || attributes?.uid || attributes?.name;
    if (!username) {
      return { user: null, error: 'No identifiable user attribute received from SAML IdP' };
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

  /**
   * Generate the SAML authorization URL for redirect.
   */
  getAuthorizationUrl(config: SsoConfig, state: string): string {
    // The SAML SP-initiated flow: return the entry point URL with RelayState
    const entryPoint = config.samlEntryPoint!;
    const separator = entryPoint.includes('?') ? '&' : '?';
    return `${entryPoint}${separator}RelayState=${encodeURIComponent(state)}`;
  }
}