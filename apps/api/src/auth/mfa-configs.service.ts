import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MfaConfig } from './entities/mfa-config.entity.js';
import { CreateMfaConfigDto } from './dto/create-mfa-config.dto.js';
import { UpdateMfaConfigDto } from './dto/update-mfa-config.dto.js';

@Injectable()
export class MfaConfigsService {
  constructor(
    @InjectRepository(MfaConfig)
    private readonly mfaConfigRepo: Repository<MfaConfig>,
  ) {}

  async findAll(): Promise<MfaConfig[]> {
    return this.mfaConfigRepo.find();
  }

  async findById(id: string): Promise<MfaConfig> {
    const config = await this.mfaConfigRepo.findOneBy({ id });
    if (!config) throw new NotFoundException('MFA configuration not found');
    return config;
  }

  async create(dto: CreateMfaConfigDto): Promise<MfaConfig> {
    const existingByName = await this.mfaConfigRepo.findOneBy({ name: dto.name });
    if (existingByName) {
      throw new ConflictException('An MFA configuration with this name already exists');
    }

    const config = this.mfaConfigRepo.create(dto);
    return this.mfaConfigRepo.save(config);
  }

  async update(id: string, dto: UpdateMfaConfigDto): Promise<MfaConfig> {
    const config = await this.findById(id);
    Object.assign(config, dto);
    return this.mfaConfigRepo.save(config);
  }

  async delete(id: string): Promise<void> {
    const config = await this.findById(id);
    await this.mfaConfigRepo.remove(config);
  }

  async getActiveConfigs(): Promise<MfaConfig[]> {
    return this.mfaConfigRepo.find({ where: { enabled: true } });
  }
}