import { SsoConfig } from '../entities/sso-config.entity.js';
import { User } from '../entities/user.entity.js';
import type { SsoIdentity } from '../auth.service.types.js';

export interface SsoLoginStrategy {
  /** The type name matching SsoType enum values (e.g., 'saml', 'oidc') */
  name: string;

  /**
   * Authenticate a user based on SSO identity claims.
   * Implementation should lookup or create the User.
   */
  authenticate(
    config: SsoConfig,
    identity: SsoIdentity,
  ): Promise<{ user: User | null; error?: string }>;

  /**
   * Generate the authorization URL to redirect the user to the IdP.
   * @param config The SSO configuration
   * @param state An opaque state value for CSRF protection (or callback identifier)
   */
  getAuthorizationUrl(config: SsoConfig, state: string): string;
}