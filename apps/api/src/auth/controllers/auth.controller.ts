import { Controller, Post, Body, Request, Get, Param, Query, Res } from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';

import { Public } from '../decorators/public.decorator.js';
import  { RefreshDto } from '../dto/refresh.dto.js';
import type { AuthenticatedUser } from '../guards/jwt-auth.guard.js';
import { AuthService } from "../services";
import type { LoginResult } from "../services";

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Get('configurations')
  async getConfigurations() {
    return this.authService.getActiveConfigurations();
  }

  @Public()
  @Get('configurations/:id')
  async getConfiguration(@Param('id') id: string) {
    return this.authService.getConfiguration(id);
  }

  /**
   * POST /auth/login — unified login endpoint.
   * Takes { configId, ...credentials }. Works for password (direct auth)
   * and SSO (returns redirectUrl when no credentials match).
   */
  @Public()
  @Post('login')
  async login(@Body() body: Record<string, unknown>) {
    const { configId, ...credentials } = body as { configId: string; [key: string]: unknown };
    if (!configId) {
      throw new Error('configId is required');
    }
    const result: LoginResult = await this.authService.login(configId, credentials);

    if (result.mfaChallenge) {
      return { mfaRequired: true, mfaChallenge: result.mfaChallenge };
    }
    if (result.redirectUrl) {
      return { redirectUrl: result.redirectUrl };
    }
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  /**
   * GET /auth/callback/:configId — handles SSO callback for both OIDC and SAML.
   */
  @Public()
  @Get('callback/:configId')
  async callback(
    @Param('configId') configId: string,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
    try {
      const result: LoginResult = await this.authService.handleCallback(configId, query);

      if (result.mfaChallenge) {
        res.redirect(
          `${frontendUrl}/login?mfa_required=true&challenge_token=${encodeURIComponent(result.mfaChallenge.challengeToken)}`,
        );
        return;
      }
      res.redirect(
        `${frontendUrl}/login?sso_access_token=${encodeURIComponent(result.accessToken!)}&sso_refresh_token=${encodeURIComponent(result.refreshToken!)}`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      res.redirect(
        `${frontendUrl}/login?sso_error=${encodeURIComponent(message)}`,
      );
    }
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Get('me')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }
}