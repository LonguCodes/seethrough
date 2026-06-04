import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthMethod } from './entities/auth-method.entity.js';
import { MfaConfig } from './entities/mfa-config.entity.js';
import { CreateAuthMethodDto } from './dto/create-auth-method.dto.js';
import { UpdateAuthMethodDto } from './dto/update-auth-method.dto.js';

@Injectable()
export class AuthMethodsService {
  async findAll(): Promise<AuthMethod[]> {
    return AuthMethod.find({
      relations: ['mfaConfig'],
    });
  }

  async findById(id: string): Promise<AuthMethod> {
    const config = await AuthMethod.findOne({
      where: { id },
      relations: ['mfaConfig'],
    });
    if (!config) throw new NotFoundException('Auth method configuration not found');
    return config;
  }

  async findByType(type: string): Promise<AuthMethod | null> {
    return AuthMethod.findOne({
      where: { type: type as any, enabled: true },
      relations: ['mfaConfig'],
    });
  }

  async create(dto: CreateAuthMethodDto): Promise<AuthMethod> {
    const existingByName = await AuthMethod.findOneBy({ name: dto.name });
    if (existingByName) {
      throw new ConflictException('An auth method configuration with this name already exists');
    }

    // Only one password strategy allowed
    if (dto.type === 'password') {
      const existingPassword = await AuthMethod.findOneBy({ type: 'password' as any });
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
      const mfaConfig = await MfaConfig.findOneBy({ id: dto.mfaConfigId });
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
      const enabledCount = await AuthMethod.count({ where: { enabled: true } });
      if (enabledCount <= 1) {
        throw new BadRequestException('Cannot disable the only enabled authentication method. At least one method must remain active.');
      }
    }

    if (dto.mfaConfigId !== undefined) {
      if (dto.mfaConfigId === null || dto.mfaConfigId === '') {
        config.mfaConfig = null;
      } else {
        const mfaConfig = await MfaConfig.findOneBy({ id: dto.mfaConfigId });
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
    const totalCount = await AuthMethod.count();

    // Block deleting the only remaining auth method
    if (totalCount <= 1) {
      throw new BadRequestException('Cannot delete the only authentication method. At least one method must exist.');
    }

    await config.remove();
  }

  async setMfaConfig(authMethodId: string, mfaConfigId: string | null): Promise<AuthMethod> {
    const authMethod = await this.findById(authMethodId);

    if (mfaConfigId) {
      const mfaConfig = await MfaConfig.findOneBy({ id: mfaConfigId });
      if (!mfaConfig) throw new NotFoundException('MFA configuration not found');
      authMethod.mfaConfig = mfaConfig as any;
    } else {
      authMethod.mfaConfig = null as any;
    }

    return authMethod.save();
  }

  async getActiveMethods(): Promise<AuthMethod[]> {
    return AuthMethod.find({
      where: { enabled: true },
      relations: ['mfaConfig'],
      order: { priority: 'ASC' },
    });
  }
}
