import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateCorrectionDto,
} from './dto/consultation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditedAction } from '../../common/decorators/audit.decorator';
import { UserRole, AuditAction } from '../../common/constants/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionLockGuard } from '../../common/guards/session-lock.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Consultations & Clinical Documentation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SessionLockGuard, RolesGuard)
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @Roles(UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.CONSULTATION_CREATED, resource: 'consultations' })
  @ApiOperation({ summary: 'Create initial clinical consultation note (Doctor only)' })
  @ApiResponse({ status: 201, description: 'Consultation drafted successfully' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateConsultationDto,
  ) {
    const data = await this.consultationsService.create(user.id, dto);
    return {
      statusCode: 201,
      message: 'Consultation drafted successfully',
      data,
    };
  }

  @Get()
  @Roles(UserRole.PHYSICIAN, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'List consultations filtered by patient or physician' })
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('physicianId') physicianId?: string,
  ) {
    const data = await this.consultationsService.findAll(patientId, physicianId);
    return {
      statusCode: 200,
      data,
    };
  }

  @Get(':id')
  @Roles(UserRole.PHYSICIAN, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Get full consultation note with vitals and amendment history' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.consultationsService.findById(id);
    return {
      statusCode: 200,
      data,
    };
  }

  @Put(':id')
  @Roles(UserRole.PHYSICIAN)
  @ApiOperation({ summary: 'Update consultation while in DRAFT status' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateConsultationDto,
  ) {
    const data = await this.consultationsService.update(id, user.id, dto);
    return {
      statusCode: 200,
      message: 'Draft consultation updated successfully',
      data,
    };
  }

  @Post(':id/finalize')
  @Roles(UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.CONSULTATION_FINALIZED, resource: 'consultations' })
  @ApiOperation({ summary: 'Sign and finalize clinical consultation (Seals against direct updates)' })
  async finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.consultationsService.finalize(id, user.id);
    return {
      statusCode: 200,
      message: 'Consultation signed and finalized successfully',
      data,
    };
  }

  @Post(':id/corrections')
  @Roles(UserRole.PHYSICIAN)
  @AuditedAction({
    action: AuditAction.CONSULTATION_CORRECTION_SUBMITTED,
    resource: 'consultation_corrections',
  })
  @ApiOperation({ summary: 'Submit safe record correction with append-only revision ledger' })
  @ApiResponse({ status: 201, description: 'Medical record amended and audit snapshot preserved' })
  async submitCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCorrectionDto,
  ) {
    const result = await this.consultationsService.submitCorrection(id, user.id, dto);
    return {
      statusCode: 201,
      message: 'Medical record amended successfully; prior snapshot preserved in immutable ledger',
      data: result,
    };
  }
}

