import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './guards/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { Public } from './decorators/public.decorator.js';

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.authService.findAllUsers();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.authService.createInvitation(
      createUserDto.username,
      createUserDto.role,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateRole(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.updateUserRole(id, updateUserDto.role!);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
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
