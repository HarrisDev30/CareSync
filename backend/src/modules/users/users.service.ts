import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Argon2Service } from '../auth/services/argon2.service';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly argon2Service: Argon2Service,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const passwordHash = await this.argon2Service.hash(dto.password);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      department: dto.department,
      isActive: true,
      sessionLocked: false,
    });

    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return await this.userRepository.save(user);
  }

  /**
   * Immediate User Access Revocation:
   * 1. Updates user is_active = false in DB
   * 2. Evicts active Redis sessions
   */
  async revokeAccess(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    user.sessionLocked = true;
    const updated = await this.userRepository.save(user);

    // Evict all session keys matching session:{userId}:* from Redis
    await this.redisService.delByPattern(`session:${id}:*`);
    await this.redisService.set(`session:${id}:revoked`, 'true', 86400);

    return updated;
  }

  async updateLastActive(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastActiveAt: new Date(),
      sessionLocked: false,
    });
  }

  async setSessionLock(id: string, locked: boolean): Promise<void> {
    await this.userRepository.update(id, {
      sessionLocked: locked,
    });
  }
}

