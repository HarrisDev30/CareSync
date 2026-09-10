import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuditLogService, AuditQueryDto } from './audit-log.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionLockGuard } from '../../common/guards/session-lock.guard';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SessionLockGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
@Controller('admin/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Query regulatory audit logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs returned' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Administrator role' })
  async getAuditLogs(@Query() query: AuditQueryDto) {
    const data = await this.auditLogService.findAll(query);
    return {
      statusCode: 200,
      data,
    };
  }
}

