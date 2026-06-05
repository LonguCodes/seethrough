import type { AuthMethod } from '../entities/auth-method.entity.js';
import type { User } from '../entities/user.entity.js';

export interface SSOLoginStrategy extends LoginStrategy {
  getStartUrl?(config: AuthMethod, redirectUri: string, state: string): string;
  handleCallback?(config: AuthMethod, params: Record<string, unknown>): Promise<{ email?: string; externalId?: string; attributes?: Record<string, unknown> }>;
}

export interface LoginStrategy {
  name: string;
  authenticate(config: AuthMethod, credentials: Record<string, unknown>): Promise<User | null>;
}
