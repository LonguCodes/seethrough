import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthMethod } from './entities/auth-method.entity.js';
import { MfaConfig } from './entities/mfa-config.entity.js';
import { CreateAuthMethodDto } from './dto/create-auth-method.dto.js';
import { UpdateAuthMethodDto } from './dto/update-auth-method.dto.js';

@Injectable()
export class AuthMethodsService {
  async findAll(): Promise<AuthMethod[]> {
    return AuthMethod.createQueryBuilder('authMethod')
      .leftJoinAndSelect('authMethod.mfaConfig', 'mfaConfig')
      .getMany();
  }

  async findById(id: string): Promise<AuthMethod> {
    const config = await AuthMethod.createQueryBuilder('authMethod')
      .leftJoinAndSelect('authMethod.mfaConfig', 'mfaConfig')
      .where('authMethod.id = :id', { id })
      .getOne();
    if (!config) throw new NotFoundException('Auth method configuration not found');
    return config;
  }

  async findByType(type: string): Promise<AuthMethod | null> {
    return AuthMethod.createQueryBuilder('authMethod')
      .leftJoinAndSelect('authMethod.mfaConfig', 'mfaConfig')
      .where('authMethod.type = :type', { type })
      .andWhere('authMethod.enabled = :enabled', { enabled: true })
      .getOne();
  }

  async create(dto: CreateAuthMethodDto): Promise<AuthMethod> {
    const existingByName = await AuthMethod.createQueryBuilder('authMethod')
      .where('authMethod.name = :name', { name: dto.name })
      .getOne();
    if (existingByName) {
      throw new ConflictException('An auth method configuration with this name already exists');
    }

    // Only one password strategy allowed
    if (dto.type === 'password') {
      const existingPassword = await AuthMethod.createQueryBuilder('authMethod')
        .where('authMethod.type = :type', { type: 'password' })
        .getOne();
      if (existingPassword) {
        throw new BadRequestException('A password authentication method already exists. Only one password method can be configured.');
      }
    }

    const config = AuthMethod.create({
      name: dto.name,
      type: dto.type,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      autoCreateUsers: dto.autoCreateUsers ?? false,
      defaultRole: dto.defaultRole ?? 'viewer',
      settings: dto.settings,
    });

    const saved = await config.save();

    // Link MFA if specified
    if (dto.mfaConfigId) {
      const mfaConfig = await MfaConfig.createQueryBuilder('mfaConfig')
        .where('mfaConfig.id = :id', { id: dto.mfaConfigId })
        .getOne();
      if (!mfaConfig) throw new NotFoundException('MFA configuration not found');
      saved.mfaConfig = mfaConfig;
      await saved.save();
    }

    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateAuthMethodDto): Promise<AuthMethod> {
    const config = await this.findById(id);

    // Block disabling the only enabled auth method
    if (dto.enabled === false && config.enabled) {
      const enabledCount = await AuthMethod.createQueryBuilder('authMethod')
        .where('authMethod.enabled = :enabled', { enabled: true })
        .getCount();
      if (enabledCount <= 1) {
        throw new BadRequestException('Cannot disable the only enabled authentication method. At least one method must remain active.');
      }
    }

    if (dto.mfaConfigId !== undefined) {
      if (dto.mfaConfigId === null || dto.mfaConfigId === '') {
        config.mfaConfig = null;
      } else {
        const mfaConfig = await MfaConfig.createQueryBuilder('mfaConfig')
          .where('mfaConfig.id = :id', { id: dto.mfaConfigId })
          .getOne();
        if (!mfaConfig) throw new NotFoundException('MFA configuration not found');
        config.mfaConfig = mfaConfig ;
      }
      delete (dto ).mfaConfigId;
    }

    Object.assign(config, dto);
    return config.save();
  }

  async delete(id: string): Promise<void> {
    const config = await this.findById(id);
    const totalCount = await AuthMethod.createQueryBuilder('authMethod').getCount();

    // Block deleting the only remaining auth method
    if (totalCount <= 1) {
      throw new BadRequestException('Cannot delete the only authentication method. At least one method must exist.');
    }

    await config.remove();
  }

  async setMfaConfig(authMethodId: string, mfaConfigId: string | null): Promise<AuthMethod> {
    const authMethod = await this.findById(authMethodId);

    if (mfaConfigId) {
      const mfaConfig = await MfaConfig.createQueryBuilder('mfaConfig')
        .where('mfaConfig.id = :id', { id: mfaConfigId })
        .getOne();
      if (!mfaConfig) throw new NotFoundException('MFA configuration not found');
      authMethod.mfaConfig = mfaConfig as any;
    } else {
      authMethod.mfaConfig = null as any;
    }

    return authMethod.save();
  }

  async getActiveMethods(): Promise<AuthMethod[]> {
    return AuthMethod.createQueryBuilder('authMethod')
      .leftJoinAndSelect('authMethod.mfaConfig', 'mfaConfig')
      .where('authMethod.enabled = :enabled', { enabled: true })
      .orderBy('authMethod.priority', 'ASC')
      .getMany();
  }
}
