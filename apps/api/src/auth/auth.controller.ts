import { Controller, Post, Body, Request, Get, Param, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import type { Request as ExpressRequest, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const { strategy = 'local', ...credentials } = loginDto;
    return this.authService.login(strategy, credentials);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Get('me')
  getProfile(@Request() req: ExpressRequest & { user: any }) {
    return req.user;
  }

  // --- SSO Endpoints ---

  @Public()
  @Get('sso/providers')
  async getSsoProviders() {
    return this.authService.getSsoProviders();
  }

  @Public()
  @Get('sso/authorize/:configId')
  async ssoAuthorize(@Param('configId') configId: string) {
    return this.authService.getSsoAuthorizationUrl(configId);
  }

  @Public()
  @Get('sso/callback/:configId')
  async ssoCallback(
    @Param('configId') configId: string,
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    try {
      const tokens = await this.authService.handleSsoCallback(configId, query);
      // Redirect back to frontend with tokens in hash fragment
      const frontendUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/login?sso_access_token=${encodeURIComponent(tokens.accessToken)}&sso_refresh_token=${encodeURIComponent(tokens.refreshToken)}`,
      );
    } catch (err: any) {
      const frontendUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/login?sso_error=${encodeURIComponent(err.message || 'SSO authentication failed')}`,
      );
    }
  }
}