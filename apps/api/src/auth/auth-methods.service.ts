import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthMethod } from './entities/auth-method.entity.js';
import { MfaConfig } from './entities/mfa-config.entity.js';
import { CreateAuthMethodDto } from './dto/create-auth-method.dto.js';
import { UpdateAuthMethodDto } from './dto/update-auth-method.dto.js';

@Injectable()
export class AuthMethodsService {
  constructor(
    @InjectRepository(AuthMethod)
    private readonly authMethodRepo: Repository<AuthMethod>,
    @InjectRepository(MfaConfig)
    private readonly mfaConfigRepo: Repository<MfaConfig>,
  ) {}

  async findAll(): Promise<AuthMethod[]> {
    return this.authMethodRepo.find({
      relations: ['mfaConfig'],
    });
  }

  async findById(id: string): Promise<AuthMethod> {
    const config = await this.authMethodRepo.findOne({
      where: { id },
      relations: ['mfaConfig'],
    });
    if (!config) throw new NotFoundException('Auth method configuration not found');
    return config;
  }

  async findByType(type: string): Promise<AuthMethod | null> {
    return this.authMethodRepo.findOne({
      where: { type: type as any, enabled: true },
      relations: ['mfaConfig'],
    });
  }

  async create(dto: CreateAuthMethodDto): Promise<AuthMethod> {
    const existingByName = await this.authMethodRepo.findOneBy({ name: dto.name });
    if (existingByName) {
      throw new ConflictException('An auth method configuration with this name already exists');
    }

    // Only one password strategy allowed
    if (dto.type === 'password') {
      const existingPassword = await this.authMethodRepo.findOneBy({ type: 'password' as any });
      if (existingPassword) {
        throw new BadRequestException('A password authentication method already exists. Only one password method can be configured.');
      }
    }

    const config = this.authMethodRepo.create({
      name: dto.name,
      type: dto.type as any,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      autoCreateUsers: dto.autoCreateUsers ?? false,
      defaultRole: dto.defaultRole ?? 'viewer',
      settings: dto.settings,
    } as any);

    const saved = await this.authMethodRepo.save(config as any);

    // Link MFA if specified
    if (dto.mfaConfigId) {
      const mfaConfig = await this.mfaConfigRepo.findOneBy({ id: dto.mfaConfigId });
      if (!mfaConfig) throw new NotFoundException('MFA configuration not found');
      saved.mfaConfig = mfaConfig as any;
      await this.authMethodRepo.save(saved);
    }

    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateAuthMethodDto): Promise<AuthMethod> {
    const config = await this.findById(id);
    const totalCount = await this.authMethodRepo.count();

    // Block disabling the only enabled auth method
    if (dto.enabled === false && config.enabled) {
      const enabledCount = await this.authMethodRepo.count({ where: { enabled: true } });
      if (enabledCount <= 1) {
        throw new BadRequestException('Cannot disable the only enabled authentication method. At least one method must remain active.');
      }
    }

    if (dto.mfaConfigId !== undefined) {
      if (dto.mfaConfigId === null || dto.mfaConfigId === '') {
        config.mfaConfig = null as any;
      } else {
        const mfaConfig = await this.mfaConfigRepo.findOneBy({ id: dto.mfaConfigId });
        if (!mfaConfig) throw new NotFoundException('MFA configuration not found');
        config.mfaConfig = mfaConfig as any;
      }
      delete (dto as any).mfaConfigId;
    }

    Object.assign(config, dto);
    return this.authMethodRepo.save(config);
  }

  async delete(id: string): Promise<void> {
    const config = await this.findById(id);
    const totalCount = await this.authMethodRepo.count();

    // Block deleting the only remaining auth method
    if (totalCount <= 1) {
      throw new BadRequestException('Cannot delete the only authentication method. At least one method must exist.');
    }

    await this.authMethodRepo.remove(config);
  }

  async setMfaConfig(authMethodId: string, mfaConfigId: string | null): Promise<AuthMethod> {
    const authMethod = await this.findById(authMethodId);

    if (mfaConfigId) {
      const mfaConfig = await this.mfaConfigRepo.findOneBy({ id: mfaConfigId });
      if (!mfaConfig) throw new NotFoundException('MFA configuration not found');
      authMethod.mfaConfig = mfaConfig as any;
    } else {
      authMethod.mfaConfig = null as any;
    }

    return this.authMethodRepo.save(authMethod);
  }

  async getActiveMethods(): Promise<AuthMethod[]> {
    return this.authMethodRepo.find({
      where: { enabled: true },
      relations: ['mfaConfig'],
      order: { priority: 'ASC' },
    });
  }
}