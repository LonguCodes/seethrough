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
import  { CreateRoleDto } from '../dto/create-role.dto.js';
import  { UpdateRoleDto } from '../dto/update-role.dto.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { Permissions } from '@repo/core';
import { AuthService } from "../services";

@Controller('roles')
@UseGuards(PermissionsGuard)
export class RolesController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @RequirePermissions(Permissions.USERS_VIEW)
  async findAll() {
    return this.authService.findAllRoles();
  }

  @Post()
  @RequirePermissions(Permissions.USERS_MANAGE)
  async create(@Body() dto: CreateRoleDto) {
    return this.authService.createRole(dto.name, dto.superadmin ?? false, dto.permissions ?? []);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.USERS_MANAGE)
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.authService.updateRole(id, {
      name: dto.name,
      superadmin: dto.superadmin,
      permissions: dto.permissions,
    });
  }

  @Delete(':id')
  @RequirePermissions(Permissions.USERS_MANAGE)
  async delete(@Param('id') id: string) {
    await this.authService.deleteRole(id);
    return { success: true };
  }
}