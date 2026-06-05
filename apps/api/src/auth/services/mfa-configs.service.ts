import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import type { CreateMfaConfigDto } from '../dto/create-mfa-config.dto.js';
import type { UpdateMfaConfigDto } from '../dto/update-mfa-config.dto.js';
import { MfaConfig } from '../entities/mfa-config.entity.js';

@Injectable()
export class MfaConfigsService {
  async findAll(): Promise<MfaConfig[]> {
    return MfaConfig.createQueryBuilder('mfaConfig').getMany();
  }

  async findById(id: string): Promise<MfaConfig> {
    const config = await MfaConfig.createQueryBuilder('mfaConfig')
      .where('mfaConfig.id = :id', { id })
      .getOne();
    if (!config) throw new NotFoundException('MFA configuration not found');
    return config;
  }

  async create(dto: CreateMfaConfigDto): Promise<MfaConfig> {
    const existingByName = await MfaConfig.createQueryBuilder('mfaConfig')
      .where('mfaConfig.name = :name', { name: dto.name })
      .getOne();
    if (existingByName) {
      throw new ConflictException('An MFA configuration with this name already exists');
    }

    const config = MfaConfig.create({ ...dto });
    return config.save();
  }

  async update(id: string, dto: UpdateMfaConfigDto): Promise<MfaConfig> {
    const config = await this.findById(id);
    Object.assign(config, dto);
    return config.save();
  }

  async delete(id: string): Promise<void> {
    const config = await this.findById(id);
    await config.remove();
  }

  async getActiveConfigs(): Promise<MfaConfig[]> {
    return MfaConfig.createQueryBuilder('mfaConfig')
      .where('mfaConfig.enabled = :enabled', { enabled: true })
      .getMany();
  }
}
