import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigToken } from '@longucodes/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersController } from './users.controller.js';
import { SsoController } from './sso.controller.js';
import { RolesController } from './roles.controller.js';
import { SsoService } from './sso.service.js';
import { User } from './entities/user.entity.js';
import { Session } from './entities/session.entity.js';
import { Invitation } from './entities/invitation.entity.js';
import { Role } from './entities/role.entity.js';
import { SsoConfig } from './entities/sso-config.entity.js';
import { LocalLoginStrategy } from './strategies/local-login.strategy.js';
import { SamlStrategy } from './strategies/saml.strategy.js';
import { OidcStrategy } from './strategies/oidc.strategy.js';
import { PermissionsGuard } from './guards/permissions.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, Invitation, Role, SsoConfig]),
    JwtModule.registerAsync({
      inject: [ConfigToken],
      useFactory: (config: any) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  providers: [
    AuthService,
    SsoService,
    LocalLoginStrategy,
    SamlStrategy,
    OidcStrategy,
    PermissionsGuard,
  ],
  controllers: [AuthController, UsersController, SsoController, RolesController],
  exports: [AuthService, SsoService, JwtModule, PermissionsGuard],
})
export class AuthModule {}