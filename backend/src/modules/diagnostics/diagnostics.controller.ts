import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DiagnosticsService } from './diagnostics.service';
import { CreateDiagnosticOrderDto, SubmitDiagnosticResultDto } from './dto/diagnostic.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditedAction } from '../../common/decorators/audit.decorator';
import { UserRole, AuditAction } from '../../common/constants/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionLockGuard } from '../../common/guards/session-lock.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Diagnostics & Laboratory Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SessionLockGuard, RolesGuard)
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Post('orders')
  @Roles(UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.DIAGNOSTIC_ORDER_PLACED, resource: 'diagnostic_orders' })
  @ApiOperation({ summary: 'Physician creates diagnostic laboratory order' })
  @ApiResponse({ status: 201, description: 'Diagnostic requisition created' })
  async createOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateDiagnosticOrderDto,
  ) {
    const data = await this.diagnosticsService.createOrder(user.id, dto);
    return {
      statusCode: 201,
      message: 'Diagnostic order requisitioned successfully',
      data,
    };
  }

  @Get('worklist')
  @Roles(UserRole.LABORATORY_USER)
  @ApiOperation({ summary: 'Laboratory technician worklist of pending test orders' })
  async getWorklist() {
    const data = await this.diagnosticsService.getWorklist();
    return {
      statusCode: 200,
      data,
    };
  }

  @Get('orders/:id')
  @Roles(UserRole.PHYSICIAN, UserRole.LABORATORY_USER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Get diagnostic order details and result findings' })
  async findOrder(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.diagnosticsService.findOrderById(id);
    return {
      statusCode: 200,
      data,
    };
  }

  @Post('orders/:id/results')
  @Roles(UserRole.LABORATORY_USER)
  @AuditedAction({ action: AuditAction.DIAGNOSTIC_RESULT_SUBMITTED, resource: 'diagnostic_results' })
  @ApiOperation({ summary: 'Laboratory technician submits test findings and result summary' })
  async submitResult(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: SubmitDiagnosticResultDto,
  ) {
    const data = await this.diagnosticsService.submitResult(id, user.id, dto);
    return {
      statusCode: 200,
      message: 'Diagnostic result recorded successfully',
      data,
    };
  }

  @Post('orders/:id/verify')
  @Roles(UserRole.LABORATORY_USER)
  @AuditedAction({ action: AuditAction.DIAGNOSTIC_RESULT_VERIFIED, resource: 'diagnostic_results' })
  @ApiOperation({ summary: 'Senior laboratory supervisor verifies and signs off result' })
  async verifyResult(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.diagnosticsService.verifyResult(id, user.id);
    return {
      statusCode: 200,
      message: 'Diagnostic result verified successfully by laboratory supervisor',
      data,
    };
  }

  @Post('orders/:id/review')
  @Roles(UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.DIAGNOSTIC_RESULT_REVIEWED, resource: 'diagnostic_results' })
  @ApiOperation({ summary: 'Attending physician acknowledges and reviews result findings' })
  async reviewResult(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.diagnosticsService.reviewResult(id, user.id);
    return {
      statusCode: 200,
      message: 'Diagnostic result marked as clinically reviewed by physician',
      data,
    };
  }
}

