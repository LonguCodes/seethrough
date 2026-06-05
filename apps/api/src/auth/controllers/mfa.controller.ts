import { Controller, Post, Get, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

import { Public } from '../decorators/public.decorator.js';
import type { VerifyMfaDto } from '../dto/verify-mfa.dto.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import type { MfaService } from '../services/mfa.service';


@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Public()
  @Post('verify')
  async verify(@Body() dto: VerifyMfaDto) {
    return this.mfaService.verifyMfa(dto.challengeToken, dto.type, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('enrollments')
  async getEnrollments(@Request() req: ExpressRequest & { user: any }) {
    return this.mfaService.getUserEnrollments(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enroll/:mfaConfigId')
  async enroll(@Param('mfaConfigId') mfaConfigId: string, @Request() req: ExpressRequest & { user: any }) {
    return this.mfaService.enrollUser(req.user.id, mfaConfigId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enroll/:enrollmentId/verify')
  async verifyEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Body('code') code: string,
    @Request() req: ExpressRequest & { user: any },
  ) {
    const result = await this.mfaService.verifyEnrollment(req.user.id, enrollmentId, code);
    return { success: result };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('enrollments/:enrollmentId')
  async removeEnrollment(@Param('enrollmentId') enrollmentId: string, @Request() req: ExpressRequest & { user: any }) {
    await this.mfaService.removeEnrollment(req.user.sub, enrollmentId);
    return { success: true };
  }

  // --- Passkey-specific endpoints ---

  @UseGuards(JwtAuthGuard)
  @Post('passkey/register-options')
  async passkeyRegisterOptions(@Body('mfaConfigId') mfaConfigId: string, @Request() req: ExpressRequest & { user: any }) {
    const options = await this.mfaService.getPasskeyRegistrationOptions(req.user.id, req.user.username, mfaConfigId);
    return options;
  }

  @UseGuards(JwtAuthGuard)
  @Post('passkey/register-verify')
  async passkeyRegisterVerify(
    @Body('mfaConfigId') mfaConfigId: string,
    @Body('response') response: any,
    @Request() req: ExpressRequest & { user: any },
  ) {
    const enrollment = await this.mfaService.verifyPasskeyRegistration(req.user.id, mfaConfigId, response);
    return { success: true, enrollmentId: enrollment.id };
  }

  // --- Passkey login authentication ---

  @Public()
  @Post('passkey/authenticate-options')
  async passkeyAuthenticateOptions(@Body('challengeToken') challengeToken: string) {
    const options = await this.mfaService.getPasskeyAuthenticateOptions(challengeToken);
    return options;
  }
}
