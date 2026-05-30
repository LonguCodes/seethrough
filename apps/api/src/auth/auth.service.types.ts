/**
 * Shared types used by AuthService and SSO strategies.
 */

export interface SsoIdentity {
  /** Unique identifier from the identity provider */
  externalId?: string;
  /** Email address if provided */
  email?: string;
  /** Arbitrary attributes from the IdP */
  attributes?: Record<string, any>;
}