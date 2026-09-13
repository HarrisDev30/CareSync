import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';
import { RedisService } from '../services/redis.service';

@Injectable()
export class SessionLockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If not authenticated or unlock endpoint, allow
    if (!user || !user.id) {
      return true;
    }

    // Explicitly allow unlock endpoint even when locked
    const path = request.url || request.path || '';
    if (path.includes('/auth/unlock')) {
      return true;
    }

    const lockKey = `session:${user.id}:locked`;
    const isLocked = await this.redisService.get(lockKey);
    if (isLocked === 'true') {
      throw new HttpException(
        'Session inactive. Workstation auto-locked after 15 minutes of inactivity. Re-authentication required.',
        HttpStatus.LOCKED, // HTTP 423
      );
    }

    const lastActiveKey = `session:${user.id}:last_active`;
    const lastActive = await this.redisService.get(lastActiveKey);

    if (!lastActive) {
      // Check token issue time (iat in seconds) to differentiate server cache restart from genuine inactivity
      const tokenAgeSec = user.iat !== undefined ? (Date.now() / 1000) - user.iat : 9999;
      if (tokenAgeSec >= 900) {
        // Genuine inactivity timeout reached! Lock session
        await this.redisService.set(lockKey, 'true', 3600);
        throw new HttpException(
          'Session inactive. Workstation auto-locked after 15 minutes of inactivity. Re-authentication required.',
          HttpStatus.LOCKED, // HTTP 423
        );
      }
    }

    // Refresh the 15-minute sliding window (900 seconds)
    await this.redisService.set(lastActiveKey, new Date().toISOString(), 900);

    return true;
  }
}

