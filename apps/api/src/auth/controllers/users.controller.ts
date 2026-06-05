import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';

import { RequirePermissions } from '../decorators/permissions.decorator.js';
import { Public } from '../decorators/public.decorator.js';
import type { AcceptInvitationDto } from '../dto/accept-invitation.dto.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import type { UpdateUserDto } from '../dto/update-user.dto.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { PERMISSIONS } from '../permissions.js';
import type { AuthService } from '../services/auth.service';

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  async findAll() {
    return this.authService.findAllUsers();
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.authService.createInvitation(
      createUserDto.username,
      createUserDto.role,
    );
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  async updateRole(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.updateUserRole(id, updateUserDto.role!);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.authService.deleteUser(id, req.user.id);
    return { message: 'User deleted' };
  }

  // --- Public invitation endpoints ---

  @Public()
  @Get('invite/:token')
  async getInvitation(@Param('token') token: string) {
    return this.authService.getInvitation(token);
  }

  @Public()
  @Post('invite/:token/accept')
  async acceptInvitation(
    @Param('token') token: string,
    @Body() acceptDto: AcceptInvitationDto,
  ) {
    return this.authService.acceptInvitation(token, acceptDto.password);
  }
}