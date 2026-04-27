import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/database/prisma.service";
import { loadJwtSecret } from "../../config/jwt.config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: loadJwtSecret(),
    });
  }

  async validate(payload: { sub: string; roles?: string[]; jti?: string }) {
    // payload 包含 sub (user id), roles, jti（已移除 email，符合 NIST 最小化原则）
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        phone: true, // 脱敏值
        email: true, // 脱敏值
        userType: true,
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User not found or inactive");
    }

    // 返回用户信息（不含 PII 加密字段）
    return {
      id: user.id,
      name: user.name,
      phone: user.phone, // 脱敏
      email: user.email, // 脱敏
      userType: user.userType,
      roles: payload.roles,
    };
  }
}
