import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditedAction } from '../../common/decorators/audit.decorator';
import { UserRole, AuditAction } from '../../common/constants/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionLockGuard } from '../../common/guards/session-lock.guard';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SessionLockGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new staff user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    const { passwordHash, ...sanitized } = user;
    return {
      statusCode: 201,
      message: 'User created successfully',
      data: sanitized,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all staff users (Admin only)' })
  async findAll() {
    const users = await this.usersService.findAll();
    const sanitized = users.map(({ passwordHash, ...u }) => u);
    return {
      statusCode: 200,
      data: sanitized,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID (Admin only)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    const { passwordHash, ...sanitized } = user;
    return {
      statusCode: 200,
      data: sanitized,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user record (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, dto);
    const { passwordHash, ...sanitized } = user;
    return {
      statusCode: 200,
      message: 'User updated successfully',
      data: sanitized,
    };
  }

  @Post(':id/revoke')
  @AuditedAction({ action: AuditAction.USER_ACCESS_REVOKED, resource: 'users' })
  @ApiOperation({ summary: 'Immediate Access Revocation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Staff access terminated immediately' })
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.revokeAccess(id);
    const { passwordHash, ...sanitized } = user;
    return {
      statusCode: 200,
      message: 'User access revoked and active sessions purged immediately',
      data: sanitized,
    };
  }
}

