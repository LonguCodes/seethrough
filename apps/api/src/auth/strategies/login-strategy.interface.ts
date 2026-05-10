import { User } from '../entities/user.entity.js';
import type { AppConfig } from '../../config/app.config.js';

export interface LoginStrategy {
  name: string;
  authenticate(credentials: Record<string, any>): Promise<User | null>;
}
