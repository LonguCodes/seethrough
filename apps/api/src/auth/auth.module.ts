import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigToken } from '@longucodes/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { RolesController } from './controllers/roles.controller';
import { AuthMethodsController } from './controllers/auth-methods.controller';
import { AuthMethodsService } from './auth-methods.service.js';
import { MfaConfigsController } from './controllers/mfa-configs.controller';
import { MfaConfigsService } from './mfa-configs.service.js';
import { MfaController } from './controllers/mfa.controller';
import { MfaService } from './mfa.service.js';
import { PasswordStrategy } from './strategies/password.strategy.js';
import { OidcStrategy } from './strategies/oidc.strategy.js';
import { SamlStrategy } from './strategies/saml.strategy.js';
import { TotpStrategy } from './strategies/mfa/totp.strategy.js';
import { PasskeyStrategy } from './strategies/mfa/passkey.strategy.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import {TokenService} from "./token.service.js";
import {AppConfig} from "../config/app.config.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigToken],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  providers: [
    JwtAuthGuard,
    AuthService,
    AuthMethodsService,
    MfaConfigsService,
    MfaService,
    PasswordStrategy,
    OidcStrategy,
    SamlStrategy,
    TotpStrategy,
    PasskeyStrategy,
    PermissionsGuard,
      TokenService,
  ],
  controllers: [
    AuthController,
    UsersController,
    RolesController,
    AuthMethodsController,
    MfaConfigsController,
    MfaController,
  ],
  exports: [AuthService, MfaService, PermissionsGuard, JwtModule],
})
export class AuthModule {}