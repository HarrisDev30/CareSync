import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from '../../common/constants/enums';

export interface CreateAuditLogDto {
  userId?: string | null;
  action: AuditAction;
  resourceEntity: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  isAuthorized?: boolean;
  details?: Record<string, any>;
}

export interface AuditQueryDto {
  userId?: string;
  action?: AuditAction;
  resourceEntity?: string;
  resourceId?: string;
  isAuthorized?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async logAction(data: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditRepo.create({
      userId: data.userId || undefined,
      action: data.action,
      resourceEntity: data.resourceEntity,
      resourceId: data.resourceId || undefined,
      ipAddress: data.ipAddress || undefined,
      isAuthorized: data.isAuthorized ?? true,
      details: data.details || {},
    });

    return await this.auditRepo.save(log);
  }

  async findAll(query: AuditQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.resourceEntity) where.resourceEntity = query.resourceEntity;
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.isAuthorized !== undefined) where.isAuthorized = query.isAuthorized;

    if (query.fromDate && query.toDate) {
      where.createdAt = Between(new Date(query.fromDate), new Date(query.toDate));
    }

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
      relations: ['user'],
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

