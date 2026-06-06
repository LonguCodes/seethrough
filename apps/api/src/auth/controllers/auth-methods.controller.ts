import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../decorators/permissions.decorator.js';
import  { CreateAuthMethodDto } from '../dto/create-auth-method.dto.js';
import  { UpdateAuthMethodDto } from '../dto/update-auth-method.dto.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { AuthMethodsService } from "../services";
import { Permissions } from "@repo/core";

@Controller("auth-methods")
@UseGuards(PermissionsGuard)
export class AuthMethodsController {
  constructor(private readonly authMethodsService: AuthMethodsService) {}

  @Get()
  @RequirePermissions(Permissions.AUTH_METHODS_VIEW)
  async getAll() {
    return this.authMethodsService.findAll();
  }

  @Get(":id")
  @RequirePermissions(Permissions.AUTH_METHODS_VIEW)
  async getById(@Param("id") id: string) {
    return this.authMethodsService.findById(id);
  }

  @Post()
  @RequirePermissions(Permissions.AUTH_METHODS_MANAGE)
  async create(@Body() dto: CreateAuthMethodDto) {
    return this.authMethodsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.AUTH_METHODS_MANAGE)
  async update(@Param("id") id: string, @Body() dto: UpdateAuthMethodDto) {
    return this.authMethodsService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.AUTH_METHODS_MANAGE)
  async delete(@Param("id") id: string) {
    await this.authMethodsService.delete(id);
    return { success: true };
  }
}