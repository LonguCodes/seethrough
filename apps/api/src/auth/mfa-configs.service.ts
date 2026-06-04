import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MfaConfig } from './entities/mfa-config.entity.js';
import { CreateMfaConfigDto } from './dto/create-mfa-config.dto.js';
import { UpdateMfaConfigDto } from './dto/update-mfa-config.dto.js';

@Injectable()
export class MfaConfigsService {
  async findAll(): Promise<MfaConfig[]> {
    return MfaConfig.find();
  }

  async findById(id: string): Promise<MfaConfig> {
    const config = await MfaConfig.findOneBy({ id });
    if (!config) throw new NotFoundException('MFA configuration not found');
    return config;
  }

  async create(dto: CreateMfaConfigDto): Promise<MfaConfig> {
    const existingByName = await MfaConfig.findOneBy({ name: dto.name });
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
    return MfaConfig.find({ where: { enabled: true } });
  }
}
