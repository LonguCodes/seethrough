import type { ExecutionContext, CanActivate } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

export interface JwtPayload {
  sub: string;
  username?: string;
  role: string;
  permissions?: string[];
  machineId?: string;
}

export interface AuthenticatedUser {
  id: string;
  username?: string;
  type: 'user' | 'machine';
  role: string;
  permissions: string[];
}

export interface AuthenticatedMachine {
  machineId: string;
  id: string;
  type: 'machine';
  role: string;
  permissions: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (payload.machineId) {
        request['user'] = {
          machineId: payload.machineId,
          id: payload.machineId,
          type: 'machine',
          role: payload.role || 'agent',
          permissions: payload.permissions ?? [],
        } satisfies AuthenticatedMachine;
      } else {
        request['user'] = {
          id: payload.sub,
          username: payload.username,
          type: 'user',
          role: payload.role,
          permissions: payload.permissions ?? [],
        } satisfies AuthenticatedUser;
      }
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}