import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Argon2Service } from './services/argon2.service';
import { RedisService } from '../../common/services/redis.service';
import { LoginDto, UnlockSessionDto } from './dto/auth.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly argon2Service: Argon2Service,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account has been deactivated. Please contact Administrator.');
    }

    const isMatch = await this.argon2Service.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const expiresIn = Number(this.configService.get('JWT_EXPIRATION', 900));
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    // Initialize Redis 15-minute inactivity tracker (900 seconds)
    const lastActiveKey = `session:${user.id}:last_active`;
    const lockKey = `session:${user.id}:locked`;

    await this.redisService.set(lastActiveKey, new Date().toISOString(), expiresIn);
    await this.redisService.del(lockKey);
    await this.redisService.del(`session:${user.id}:revoked`);

    await this.usersService.updateLastActive(user.id);

    return {
      accessToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        sessionLocked: false,
      },
    };
  }

  async unlock(user: User, dto: UnlockSessionDto) {
    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser.isActive) {
      throw new ForbiddenException('Account inactive');
    }

    const isMatch = await this.argon2Service.verify(fullUser.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password for session unlock');
    }

    // Reset Redis 15-minute sliding window
    const expiresIn = Number(this.configService.get('JWT_EXPIRATION', 900));
    await this.redisService.del(`session:${user.id}:locked`);
    await this.redisService.set(`session:${user.id}:last_active`, new Date().toISOString(), expiresIn);

    await this.usersService.setSessionLock(user.id, false);

    return {
      sessionLocked: false,
      lastActiveAt: new Date().toISOString(),
    };
  }

  async logout(user: User) {
    await this.redisService.delByPattern(`session:${user.id}:*`);
    await this.usersService.setSessionLock(user.id, true);
    return {
      message: 'Session successfully terminated',
    };
  }
}

