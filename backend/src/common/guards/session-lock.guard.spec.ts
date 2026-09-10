import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SessionLockGuard } from './session-lock.guard';
import { RedisService } from '../services/redis.service';

describe('SessionLockGuard', () => {
  let guard: SessionLockGuard;
  let redisService: RedisService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionLockGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<SessionLockGuard>(SessionLockGuard);
    redisService = module.get<RedisService>(RedisService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow public endpoints to pass through', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow unlock endpoint to pass through even if locked', async () => {
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-uuid' },
          url: '/api/v1/auth/unlock',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('should refresh TTL and allow access when user was active within 15 minutes', async () => {
    jest.spyOn(redisService, 'get').mockImplementation(async (key: string) => {
      if (key.includes(':locked')) return null;
      if (key.includes(':last_active')) return new Date().toISOString();
      return null;
    });
    const setSpy = jest.spyOn(redisService, 'set');

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-uuid' },
          url: '/api/v1/patients',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    const canActivate = await guard.canActivate(mockContext);
    expect(canActivate).toBe(true);
    expect(setSpy).toHaveBeenCalledWith('session:user-uuid:last_active', expect.any(String), 900);
  });

  it('should throw HTTP 423 Locked if inactivity exceeds 15 minutes (key missing)', async () => {
    jest.spyOn(redisService, 'get').mockResolvedValue(null); // Inactivity key missing
    const setSpy = jest.spyOn(redisService, 'set');

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-uuid' },
          url: '/api/v1/patients',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);
    expect(setSpy).toHaveBeenCalledWith('session:user-uuid:locked', 'true', 3600);
  });
});

