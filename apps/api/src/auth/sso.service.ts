import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SsoConfig, SsoType } from './entities/sso-config.entity.js';
import { CreateSsoConfigDto } from './dto/create-sso-config.dto.js';
import { UpdateSsoConfigDto } from './dto/update-sso-config.dto.js';

@Injectable()
export class SsoService {
  constructor(
    @InjectRepository(SsoConfig)
    private readonly ssoConfigRepo: Repository<SsoConfig>,
  ) {}

  async findAll(): Promise<SsoConfig[]> {
    return this.ssoConfigRepo.find({
      select: [
        'id', 'name', 'type', 'enabled', 'allowOnlySso',
        'autoCreateUsers', 'defaultRole', 'samlEntryPoint',
        'samlIssuer', 'samlCert', 'oidcIssuerUrl', 'oidcClientId',
        'createdAt', 'updatedAt',
      ],
    });
  }

  async findById(id: string): Promise<SsoConfig> {
    const config = await this.ssoConfigRepo.findOne({
      where: { id },
      select: [
        'id', 'name', 'type', 'enabled', 'allowOnlySso',
        'autoCreateUsers', 'defaultRole', 'samlEntryPoint',
        'samlIssuer', 'samlCert', 'oidcIssuerUrl', 'oidcClientId',
        'oidcClientSecret', 'createdAt', 'updatedAt',
      ],
    });
    if (!config) throw new NotFoundException('SSO configuration not found');
    return config;
  }

  async create(dto: CreateSsoConfigDto): Promise<SsoConfig> {
    const existingByName = await this.ssoConfigRepo.findOneBy({ name: dto.name });
    if (existingByName) {
      throw new ConflictException('An SSO configuration with this name already exists');
    }

    const config = this.ssoConfigRepo.create(dto);
    return this.ssoConfigRepo.save(config);
  }

  async update(id: string, dto: UpdateSsoConfigDto): Promise<SsoConfig> {
    const config = await this.findById(id);
    Object.assign(config, dto);
    return this.ssoConfigRepo.save(config);
  }

  async delete(id: string): Promise<void> {
    const config = await this.findById(id);
    await this.ssoConfigRepo.remove(config);
  }

  async getActiveConfigs(): Promise<SsoConfig[]> {
    return this.ssoConfigRepo.find({
      where: { enabled: true },
    });
  }

  async isOnlySsoEnabled(): Promise<boolean> {
    const configs = await this.getActiveConfigs();
    return configs.some((c) => c.allowOnlySso);
  }
}