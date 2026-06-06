import crypto from "crypto";

import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { Role } from "../entities/role.entity.js";
import { Session } from "../entities/session.entity.js";
import type { User } from "../entities/user.entity.js";
import { ALL_PERMISSIONS } from "../permissions.js";

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateTokens(user: User) {

    console.log(user);
    const role = await Role.createQueryBuilder("role").where({ id: user.roleId }).getOne();

    console.log(role);
    const permissions: string[] = role?.superadmin
      ? [...ALL_PERMISSIONS]
      : (role?.permissions ?? []);

    const session = Session.create({
      token: crypto.randomBytes(32).toString("hex"),
      user,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    await session.save();

    const accessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role?.name,
      permissions,
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: "30m" });

    return {
      accessToken,
      refreshToken: session.token,
    };
  }
}
