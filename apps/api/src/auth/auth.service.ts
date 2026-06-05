import {
  Injectable,
  UnauthorizedException,
  Inject,
  OnModuleInit,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ConfigToken } from '@longucodes/config';
import { User } from './entities/user.entity.js';
import { Session } from './entities/session.entity.js';
import { Invitation } from './entities/invitation.entity.js';
import { Role } from './entities/role.entity.js';
import { AuthMethod } from './entities/auth-method.entity.js';
import { LoginStrategy } from './strategies/login-strategy.interface.js';
import { PasswordStrategy } from './strategies/password.strategy.js';
import { OidcStrategy } from './strategies/oidc.strategy.js';
import { SamlStrategy } from './strategies/saml.strategy.js';
import { DEFAULT_ROLES, ALL_PERMISSIONS } from './permissions.js';
import { AuthMethodsService } from './auth-methods.service.js';
import { MfaService, MfaChallenge } from './mfa.service.js';
import type { AppConfig } from '../config/app.config.js';
import {TokenService} from "./token.service.js";

export interface LoginResult {
  accessToken?: string;
  refreshToken?: string;
  mfaChallenge?: MfaChallenge;
  redirectUrl?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private strategies: Map<string, LoginStrategy> = new Map();

  constructor(
    @Inject(ConfigToken) private readonly config: AppConfig,
     passwordStrategy: PasswordStrategy,
     oidcStrategy: OidcStrategy,
     samlStrategy: SamlStrategy,
    private readonly authMethodsService: AuthMethodsService,
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
  ) {
    this.registerStrategy(passwordStrategy);
    this.registerStrategy(oidcStrategy);
    this.registerStrategy(samlStrategy);
  }

  async onModuleInit() {
    await this.provisionDefaultRoles();
    await this.provisionDefaultUser();
  }

  // --- Role Management ---

  private async provisionDefaultRoles() {
    const roleCount = await Role.createQueryBuilder('role').getCount();
    if (roleCount > 0) return;

    for (const def of DEFAULT_ROLES) {
      const role = Role.create({
        name: def.name,
        superadmin: def.superadmin,
        permissions: def.permissions as string[],
      });
      await role.save();
      console.log(`Provisioned default role: ${def.name}`);
    }
  }

  async findAllRoles(): Promise<Role[]> {
    return Role.createQueryBuilder('role').getMany();
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return Role.createQueryBuilder('role')
      .where('role.name = :name', { name })
      .getOne();
  }

  async createRole(name: string, superadmin: boolean, permissions: string[]): Promise<Role> {
    const existing = await Role.createQueryBuilder('role')
      .where('role.name = :name', { name })
      .getOne();
    if (existing) {
      throw new ConflictException(`Role "${name}" already exists`);
    }
    const role = Role.create({ name, superadmin, permissions });
    return role.save();
  }

  async updateRole(
    id: string,
    updates: { name?: string; superadmin?: boolean; permissions?: string[] },
  ): Promise<Role> {
    const role = await Role.createQueryBuilder('role')
      .where('role.id = :id', { id })
      .getOne();
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (updates.name !== undefined) {
      const existing = await Role.createQueryBuilder('role')
        .where('role.name = :name', { name: updates.name })
        .getOne();
      if (existing && existing.id !== id) {
        throw new ConflictException(`Role "${updates.name}" already exists`);
      }
      role.name = updates.name;
    }
    if (updates.superadmin !== undefined) {
      role.superadmin = updates.superadmin;
    }
    if (updates.permissions !== undefined) {
      role.permissions = updates.permissions;
    }
    return role.save();
  }

  async deleteRole(id: string): Promise<void> {
    const role = await Role.createQueryBuilder('role')
      .where('role.id = :id', { id })
      .getOne();
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    const usersWithRole = await User.createQueryBuilder('user')
      .where('user.role.id = :id', { id })
      .getCount();
    if (usersWithRole > 0) {
      throw new ConflictException(
        `Cannot delete role "${role.name}" because ${usersWithRole} user(s) are assigned to it`,
      );
    }
    await role.remove();
  }

  // --- Strategy Registry ---

  registerStrategy(strategy: LoginStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  private getStrategy(type: string): LoginStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new BadRequestException(`Auth type '${type}' is not supported`);
    }
    return strategy;
  }

  // --- Unified Auth Flow ---

  /**
   * GET /auth/configurations/:id — returns public info about a method
   */
  async getConfiguration(configId: string): Promise<{ id: string; name: string; type: string; enabled: boolean }> {
    const config = await AuthMethod.createQueryBuilder('authMethod')
      .where('authMethod.id = :id', { id: configId })
      .getOne();
    if (!config || !config.enabled) {
      throw new NotFoundException('Configuration not found or disabled');
    }
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      enabled: config.enabled,
    };
  }

  /**
   * GET /auth/configurations — returns all active methods for login UI
   */
  async getActiveConfigurations(): Promise<Array<{ id: string; name: string; type: string }>> {
    const methods = await this.authMethodsService.getActiveMethods();
    return methods.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
    }));
  }


  async login(configId: string, credentials: Record<string, any>): Promise<LoginResult> {
    const config = await AuthMethod.createQueryBuilder('authMethod')
      .leftJoinAndSelect('authMethod.mfaConfig', 'mfaConfig')
      .where('authMethod.id = :id', { id: configId })
      .andWhere('authMethod.enabled = :enabled', { enabled: true })
      .getOne();
    if (!config) {
      throw new NotFoundException('Configuration not found or disabled');
    }

    const strategy = this.getStrategy(config.type);

    // Try direct authentication (password)
    const user = await strategy.authenticate(config, credentials);

    if (user) {
      // Direct auth succeeded — check MFA
      const mfaChallenge = await this.mfaService.checkMfaRequirements(config, user.id);
      if (mfaChallenge) {
        return { mfaChallenge };
      }
      return this.tokenService.generateTokens(user);
    }

    // If authenticate returned null, check for redirect-based sign-in (OIDC/SAML)
    const startUrl = await this.getStrategyStartUrl(config);
    if (startUrl) {
      return { redirectUrl: startUrl };
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  private async getStrategyStartUrl(config: AuthMethod): Promise<string | null> {
    const strategy = this.getStrategy(config.type);

    // Check if strategy has a getStartUrl method
    const startUrlFn = (strategy as any).getStartUrl;
    if (typeof startUrlFn !== 'function') {
      return null;
    }

    const state = crypto.randomBytes(16).toString('hex');
    const stateWithConfig = Buffer.from(JSON.stringify({ state, configId: config.id })).toString('base64url');

    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/auth/callback/${config.id}`;
    return startUrlFn.call(strategy, config, redirectUri, stateWithConfig);
  }

  /**
   * GET /auth/callback/:configId — handle SSO callback
   */
  async handleCallback(configId: string, query: Record<string, any>): Promise<LoginResult> {
    const config = await AuthMethod.createQueryBuilder('authMethod')
      .leftJoinAndSelect('authMethod.mfaConfig', 'mfaConfig')
      .where('authMethod.id = :id', { id: configId })
      .andWhere('authMethod.enabled = :enabled', { enabled: true })
      .getOne();
    if (!config) {
      throw new NotFoundException('Configuration not found or disabled');
    }

    const strategy = this.getStrategy(config.type);
    const callbackFn = (strategy as any).handleCallback;
    if (typeof callbackFn !== 'function') {
      throw new BadRequestException(`Auth type '${config.type}' does not support callback`);
    }

    const identity = await callbackFn.call(strategy, config, query);
    const username: string | undefined =
      identity.email ||
      identity.externalId ||
      identity.attributes?.preferred_username ||
      identity.attributes?.sub ||
      identity.attributes?.username ||
      identity.attributes?.uid ||
      identity.attributes?.name;

    if (!username) {
      throw new UnauthorizedException('No identifiable user attribute received from provider');
    }

    let user = await User.createQueryBuilder('user')
      .where('user.username = :username', { username })
      .getOne();

    if (!user) {
      if (!config.autoCreateUsers) {
        throw new UnauthorizedException('User does not exist and auto-creation is disabled');
      }

      const role = await Role.createQueryBuilder('role')
        .where('role.name = :name', { name: config.defaultRole || 'viewer' })
        .getOne();
      user = User.create({
        username,
        password: '',
        role: role || undefined,
      });
      await user.save();
    }

    const mfaChallenge = await this.mfaService.checkMfaRequirements(config, user.id);
    if (mfaChallenge) {
      return { mfaChallenge };
    }

    return this.tokenService.generateTokens(user);
  }

  async refresh(token: string) {
    const storedToken = await Session.createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.token = :token', { token })
      .getOne();

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await storedToken.remove();
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.tokenService.generateTokens(storedToken.user);
    await storedToken.remove();
    return tokens;
  }



  // --- Default User Provisioning ---

  private async provisionDefaultUser() {
    // Provision default password auth method if none exist
    const methodCount = await AuthMethod.createQueryBuilder('authMethod').getCount();
    if (methodCount === 0) {
      const method = new AuthMethod();
      method.name = 'Local Login';
      method.type = 'password' as any;
      method.enabled = true;
      method.priority = 0;
      method.autoCreateUsers = false;
      method.defaultRole = 'viewer';
      method.settings = {
        type: 'password',
        minPasswordLength: 8,
        requireComplexity: false,
      };
      await method.save();
      console.log('Provisioned default password auth method');
    }

    const userCount = await User.createQueryBuilder('user').getCount();
    if (userCount === 0) {
      const superadminRole = await Role.createQueryBuilder('role')
        .where('role.name = :name', { name: 'superadmin' })
        .getOne();
      if (!superadminRole) {
        console.warn('No superadmin role found, cannot provision default user');
        return;
      }

      const hashedPassword = await bcrypt.hash(this.config.defaultAdmin.password, 10);
      const admin = User.create({
        username: this.config.defaultAdmin.username,
        password: hashedPassword,
        role: superadminRole,
      });
      await admin.save();
      console.log(
        `Provisioned default admin user: ${this.config.defaultAdmin.username}`,
      );
    }
  }

  async validateUser(userId: string) {
    return User.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id: userId })
      .getOne();
  }

  // --- User Management ---

  async findAllUsers(): Promise<Partial<User>[]> {
    const users = await User.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .getMany();
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
    }));
  }

  async createInvitation(
    username: string,
    roleName: string = 'viewer',
  ): Promise<{ token: string; username: string; role: string; expiresAt: Date }> {
    const existingUser = await User.createQueryBuilder('user')
      .where('user.username = :username', { username })
      .getOne();
    if (existingUser) {
      throw new ConflictException(`User "${username}" already exists`);
    }

    const role = await Role.createQueryBuilder('role')
      .where('role.name = :name', { name: roleName })
      .getOne();
    if (!role) {
      throw new BadRequestException(`Role "${roleName}" not found`);
    }

    const existingInvitation = await Invitation.createQueryBuilder('invitation')
      .where('invitation.username = :username', { username })
      .andWhere('invitation.accepted = :accepted', { accepted: false })
      .getOne();
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

    return { token, username, role: role.name, expiresAt };
  }

  async getInvitation(
    token: string,
  ): Promise<{ username: string; role: string; expiresAt: Date }> {
    const invitation = await Invitation.createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.role', 'role')
      .where('invitation.token = :token', { token })
      .getOne();

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.accepted) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    return {
      username: invitation.username,
      role: invitation.role.name,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(
    token: string,
    password: string,
  ): Promise<Partial<User>> {
    const invitation = await Invitation.createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.role', 'role')
      .where('invitation.token = :token', { token })
      .getOne();

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.accepted) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    const existingUser = await User.createQueryBuilder('user')
      .where('user.username = :username', { username: invitation.username })
      .getOne();
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

    return { id: saved.id, username: saved.username, role: saved.role };
  }

  async updateUserRole(
    userId: string,
    roleName: string,
  ): Promise<Partial<User>> {
    const user = await User.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const role = await Role.createQueryBuilder('role')
      .where('role.name = :name', { name: roleName })
      .getOne();
    if (!role) {
      throw new BadRequestException(`Role "${roleName}" not found`);
    }

    user.role = role;
    const saved = await user.save();
    return { id: saved.id, username: saved.username, role: saved.role };
  }

  async deleteUser(userId: string, requestingUserId: string): Promise<void> {
    if (userId === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await User.createQueryBuilder('user')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    await Session.delete({ user: { id: userId } });
    await user.remove();
  }
}