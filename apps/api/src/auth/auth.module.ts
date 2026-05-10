import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigToken } from '@longucodes/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { User } from './entities/user.entity.js';
import { Session } from './entities/session.entity.js';
import { LocalLoginStrategy } from './strategies/local-login.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session]),
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
    LocalLoginStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule], // Export JwtModule so the global guard can use it
})
export class AuthModule {}
