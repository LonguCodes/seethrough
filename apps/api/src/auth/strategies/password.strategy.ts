import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { User } from '../entities/user.entity.js';
import { AuthMethod } from '../entities/auth-method.entity.js';
import { LoginStrategy } from './login-strategy.interface.js';

@Injectable()
export class PasswordStrategy implements LoginStrategy {
  name = 'password';

  async authenticate(config: AuthMethod, credentials: Record<string, any>): Promise<User | null> {
    const { username, password } = credentials;
    if (!username || !password) return null;

    const user = await User.createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.password', 'user.role'])
      .where('user.username = :username', { username })
      .getOne();

    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result as User;
    }

    return null;
  }
}