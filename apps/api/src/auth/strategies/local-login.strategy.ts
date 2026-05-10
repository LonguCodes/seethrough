import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { User } from '../entities/user.entity.js';
import { LoginStrategy } from './login-strategy.interface.js';

@Injectable()
export class LocalLoginStrategy implements LoginStrategy {
  name = 'local';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async authenticate(credentials: Record<string, any>): Promise<User | null> {
    const { username, password } = credentials;
    if (!username || !password) return null;

    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'role'], // Include password for validation
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result as User;
    }

    return null;
  }
}
