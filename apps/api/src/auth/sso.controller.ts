import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SsoService } from './sso.service.js';
import { CreateSsoConfigDto } from './dto/create-sso-config.dto.js';
import { UpdateSsoConfigDto } from './dto/update-sso-config.dto.js';
import { RequirePermissions } from './decorators/permissions.decorator.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { PERMISSIONS } from './permissions.js';

@Controller('sso')
@UseGuards(PermissionsGuard)
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SSO_VIEW)
  async getAll() {
    return this.ssoService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SSO_VIEW)
  async getById(@Param('id') id: string) {
    return this.ssoService.findById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SSO_MANAGE)
  async create(@Body() dto: CreateSsoConfigDto) {
    return this.ssoService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SSO_MANAGE)
  async update(@Param('id') id: string, @Body() dto: UpdateSsoConfigDto) {
    return this.ssoService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SSO_MANAGE)
  async delete(@Param('id') id: string) {
    await this.ssoService.delete(id);
    return { success: true };
  }
}