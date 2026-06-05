import type { AuthMethod } from '../entities/auth-method.entity.js';
import type { User } from '../entities/user.entity.js';

export interface LoginStrategy {
  name: string;
  authenticate(config: AuthMethod, credentials: Record<string, any>): Promise<User | null>;
}