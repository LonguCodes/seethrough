import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MfaConfigsService } from '../mfa-configs.service.js';
import { CreateMfaConfigDto } from '../dto/create-mfa-config.dto.js';
import { UpdateMfaConfigDto } from '../dto/update-mfa-config.dto.js';
import { RequirePermissions } from '../decorators/permissions.decorator.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { PERMISSIONS } from '../permissions.js';

@Controller('mfa-configs')
@UseGuards(PermissionsGuard)
export class MfaConfigsController {
  constructor(private readonly mfaConfigsService: MfaConfigsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MFA_VIEW)
  async getAll() {
    return this.mfaConfigsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.MFA_VIEW)
  async getById(@Param('id') id: string) {
    return this.mfaConfigsService.findById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MFA_MANAGE)
  async create(@Body() dto: CreateMfaConfigDto) {
    return this.mfaConfigsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MFA_MANAGE)
  async update(@Param('id') id: string, @Body() dto: UpdateMfaConfigDto) {
    return this.mfaConfigsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.MFA_MANAGE)
  async delete(@Param('id') id: string) {
    await this.mfaConfigsService.delete(id);
    return { success: true };
  }
}
