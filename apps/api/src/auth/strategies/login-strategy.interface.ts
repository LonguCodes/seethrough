import { User } from '../entities/user.entity.js';
import { AuthMethod } from '../entities/auth-method.entity.js';

export interface LoginStrategy {
  name: string;
  authenticate(config: AuthMethod, credentials: Record<string, any>): Promise<User | null>;
}