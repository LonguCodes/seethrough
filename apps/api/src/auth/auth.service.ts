import { Injectable, UnauthorizedException, Inject, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { ConfigToken } from '@longucodes/config';
import { User } from './entities/user.entity.js';
import { Session } from './entities/session.entity.js';
import { LoginStrategy } from './strategies/login-strategy.interface.js';
import { LocalLoginStrategy } from './strategies/local-login.strategy.js';
import type { AppConfig } from '../config/app.config.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private strategies: Map<string, LoginStrategy> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @Inject(ConfigToken) private readonly config: AppConfig,
    private readonly localStrategy: LocalLoginStrategy,
  ) {
    this.registerStrategy(localStrategy);
  }

  async onModuleInit() {
    await this.provisionDefaultUser();
  }

  registerStrategy(strategy: LoginStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  async login(strategyName: string, credentials: Record<string, any>) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new UnauthorizedException(`Strategy ${strategyName} not found`);
    }

    const user = await strategy.authenticate(credentials);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refresh(token: string) {
    const storedToken = await this.sessionRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await this.sessionRepository.remove(storedToken);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(storedToken.user);
    await this.sessionRepository.remove(storedToken);
    return tokens;
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });
    const refreshTokenValue = this.jwtService.sign(payload, { expiresIn: '14d' });

    const session = this.sessionRepository.create({
      token: refreshTokenValue,
      user,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private async provisionDefaultUser() {
    const userCount = await this.userRepository.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash(this.config.defaultAdmin.password, 10);
      const admin = this.userRepository.create({
        username: this.config.defaultAdmin.username,
        password: hashedPassword,
        role: 'admin',
      });
      await this.userRepository.save(admin);
      console.log(`Provisioned default admin user: ${this.config.defaultAdmin.username}`);
    }
  }

  async validateUser(userId: string) {
    return this.userRepository.findOneBy({ id: userId });
  }
}
