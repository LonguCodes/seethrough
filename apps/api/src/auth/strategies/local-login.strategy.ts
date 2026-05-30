import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { User } from '../entities/user.entity.js';
import { LoginStrategy } from './login-strategy.interface.js';

@Injectable()
export class LocalLoginStrategy implements LoginStrategy {
  name = 'local';

  async authenticate(credentials: Record<string, any>): Promise<User | null> {
    const { username, password } = credentials;
    if (!username || !password) return null;

    const user = await User.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'role'],
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result as User;
    }

    return null;
  }
}
