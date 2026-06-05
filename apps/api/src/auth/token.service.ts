import {Injectable} from "@nestjs/common";
import {ALL_PERMISSIONS} from "./permissions.js";
import {User} from "./entities/user.entity.js";
import {Role} from "./entities/role.entity.js";
import {JwtService} from "@nestjs/jwt";
import {Session} from "./entities/session.entity.js";

@Injectable()
export class TokenService {

    constructor(private readonly jwtService: JwtService) {}

    async generateTokens(user: User) {
        const role = await Role.createQueryBuilder('role')
            .where('role.name = :name', { name: user.role?.name })
            .getOne();
        const permissions: string[] = role?.superadmin
            ? [...ALL_PERMISSIONS]
            : (role?.permissions ?? []);

        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role?.name,
            permissions,
        };

        const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });
        const refreshTokenValue = this.jwtService.sign(payload, { expiresIn: '14d' });

        const session = Session.create({
            token: refreshTokenValue,
            user,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        });
        await session.save();

        return {
            accessToken,
            refreshToken: refreshTokenValue,
        };
    }

}