import { ConfigToken } from "@longucodes/config";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  AuthController,
  UsersController,
  RolesController,
  AuthMethodsController,
  MfaConfigsController,
  MfaController,
} from "./controllers";
import { Invitation } from "./entities/invitation.entity";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { PermissionsGuard } from "./guards/permissions.guard.js";
import {
  AuthService,
  AuthMethodsService,
  MfaConfigsService,
  MfaService,
  TokenService,
} from "./services";
import {
  PasskeyStrategy,
  TotpStrategy,
  OidcStrategy,
  PasswordStrategy,
  SamlStrategy,
} from "./strategies";
import type { AppConfig } from "../config/app.config.js";
import { AuthMethod } from "./entities/auth-method.entity";
import { MfaConfig } from "./entities/mfa-config.entity";
import { Role } from "./entities/role.entity";
import { Session } from "./entities/session.entity";
import { UserMfa } from "./entities/user-mfa.entity";
import { User } from "./entities/user.entity";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigToken],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: "30m" },
      }),
    }),
    TypeOrmModule.forFeature([AuthMethod, Invitation, MfaConfig, Role, Session, User, UserMfa]),
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
