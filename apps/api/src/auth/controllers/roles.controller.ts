import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import { RequirePermissions } from '../decorators/permissions.decorator.js';
import type { CreateRoleDto } from '../dto/create-role.dto.js';
import type { UpdateRoleDto } from '../dto/update-role.dto.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { PERMISSIONS } from '../permissions.js';
import type { AuthService } from '../services/auth.service';

@Controller('roles')
@UseGuards(PermissionsGuard)
export class RolesController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  async findAll() {
    return this.authService.findAllRoles();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  async create(@Body() dto: CreateRoleDto) {
    return this.authService.createRole(dto.name, dto.superadmin ?? false, dto.permissions ?? []);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.authService.updateRole(id, {
      name: dto.name,
      superadmin: dto.superadmin,
      permissions: dto.permissions,
    });
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  async delete(@Param('id') id: string) {
    await this.authService.deleteRole(id);
    return { success: true };
  }
}