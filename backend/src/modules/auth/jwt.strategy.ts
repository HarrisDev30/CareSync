import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../common/services/redis.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super_secret_jwt_key_caresync_production_grade_32chars'),
    });
  }

  async validate(payload: JwtPayload & { iat?: number }) {
    // Check if token was revoked via Redis blacklist
    const isRevoked = await this.redisService.get(`session:${payload.sub}:revoked`);
    if (isRevoked === 'true') {
      throw new UnauthorizedException('User access has been revoked');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return Object.assign(user, { iat: payload.iat });
  }
}

