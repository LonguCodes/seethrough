import { Injectable, UnauthorizedException, Inject, OnModuleInit, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ConfigToken } from '@longucodes/config';
import { User } from './entities/user.entity.js';
import { Session } from './entities/session.entity.js';
import { Invitation } from './entities/invitation.entity.js';
import { LoginStrategy } from './strategies/login-strategy.interface.js';
import { LocalLoginStrategy } from './strategies/local-login.strategy.js';
import type { AppConfig } from '../config/app.config.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private strategies: Map<string, LoginStrategy> = new Map();

  constructor(
    private readonly jwtService: JwtService,
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
    const storedToken = await Session.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await storedToken.remove();
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(storedToken.user);
    await storedToken.remove();
    return tokens;
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });
    const refreshTokenValue = this.jwtService.sign(payload, { expiresIn: '14d' });

    const session = Session.create({
      token: refreshTokenValue,
      user,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    await session.save();

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private async provisionDefaultUser() {
    const userCount = await User.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash(this.config.defaultAdmin.password, 10);
      const admin = User.create({
        username: this.config.defaultAdmin.username,
        password: hashedPassword,
        role: 'admin',
      });
      await admin.save();
      console.log(`Provisioned default admin user: ${this.config.defaultAdmin.username}`);
    }
  }

  async validateUser(userId: string) {
    return User.findOneBy({ id: userId });
  }

  // --- User Management ---

  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    return User.find({
      select: ['id', 'username', 'role'],
    });
  }

  async createInvitation(username: string, role: string = 'viewer'): Promise<{ token: string; username: string; role: string; expiresAt: Date }> {
    const existingUser = await User.findOneBy({ username });
    if (existingUser) {
      throw new ConflictException(`User "${username}" already exists`);
    }

    const existingInvitation = await Invitation.findOneBy({ username, accepted: false });
    if (existingInvitation) {
      await existingInvitation.remove();
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = Invitation.create({
      token,
      username,
      role,
      expiresAt,
    });
    await invitation.save();

    return { token, username, role, expiresAt };
  }

  async getInvitation(token: string): Promise<{ username: string; role: string; expiresAt: Date }> {
    const invitation = await Invitation.findOneBy({ token });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.accepted) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    return { username: invitation.username, role: invitation.role, expiresAt: invitation.expiresAt };
  }

  async acceptInvitation(token: string, password: string): Promise<Omit<User, 'password'>> {
    const invitation = await Invitation.findOneBy({ token });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.accepted) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    const existingUser = await User.findOneBy({ username: invitation.username });
    if (existingUser) {
      throw new ConflictException(`User "${invitation.username}" already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = User.create({
      username: invitation.username,
      password: hashedPassword,
      role: invitation.role,
    });
    const saved = await user.save();

    invitation.accepted = true;
    await invitation.save();

    return { id: saved.id, username: saved.username, role: saved.role } as User;
  }

  async updateUserRole(userId: string, role: string): Promise<Omit<User, 'password'>> {
    const user = await User.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    user.role = role;
    const saved = await user.save();
    return { id: saved.id, username: saved.username, role: saved.role } as User;
  }

  async deleteUser(userId: string, requestingUserId: string): Promise<void> {
    if (userId === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await User.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    await Session.delete({ user: { id: userId } });
    await user.remove();
  }
}