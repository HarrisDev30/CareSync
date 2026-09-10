import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto, PatientSearchQueryDto } from './dto/patient.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditedAction } from '../../common/decorators/audit.decorator';
import { UserRole, AuditAction } from '../../common/constants/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionLockGuard } from '../../common/guards/session-lock.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SessionLockGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.RECEPTIONIST, UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.PATIENT_RECORD_CREATED, resource: 'patients' })
  @ApiOperation({ summary: 'Register a new patient and encrypt PHI at rest' })
  @ApiResponse({ status: 201, description: 'Patient registered successfully' })
  async create(@Body() dto: CreatePatientDto) {
    const data = await this.patientsService.create(dto);
    return {
      statusCode: 201,
      message: 'Patient registered successfully',
      data,
    };
  }

  @Get()
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.RECEPTIONIST,
    UserRole.PHYSICIAN,
    UserRole.LABORATORY_USER,
  )
  @AuditedAction({ action: AuditAction.PATIENT_RECORD_VIEWED, resource: 'patients' })
  @ApiOperation({ summary: 'Search and list patient records' })
  async findAll(@Query() query: PatientSearchQueryDto) {
    const data = await this.patientsService.findAll(query);
    return {
      statusCode: 200,
      data,
    };
  }

  @Get(':id')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.RECEPTIONIST,
    UserRole.PHYSICIAN,
    UserRole.LABORATORY_USER,
  )
  @AuditedAction({ action: AuditAction.PATIENT_RECORD_VIEWED, resource: 'patients' })
  @ApiOperation({ summary: 'Get patient profile with role-based masking' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.patientsService.findById(id, user.role);
    return {
      statusCode: 200,
      data,
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.RECEPTIONIST, UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.PATIENT_RECORD_UPDATED, resource: 'patients' })
  @ApiOperation({ summary: 'Update patient demographics' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    const updated = await this.patientsService.update(id, dto);
    return {
      statusCode: 200,
      message: 'Patient record updated successfully',
      data: { id: updated.id, mrn: updated.mrn },
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR)
  @AuditedAction({ action: AuditAction.PATIENT_RECORD_DELETED, resource: 'patients' })
  @ApiOperation({ summary: 'Soft delete patient record (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.patientsService.softDelete(id);
    return {
      statusCode: 200,
      data,
    };
  }
}

