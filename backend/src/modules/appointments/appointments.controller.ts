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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto, AppointmentQueryDto } from './dto/appointment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditedAction } from '../../common/decorators/audit.decorator';
import { UserRole, AuditAction } from '../../common/constants/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionLockGuard } from '../../common/guards/session-lock.guard';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SessionLockGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.RECEPTIONIST, UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.APPOINTMENT_SCHEDULED, resource: 'appointments' })
  @ApiOperation({ summary: 'Book new clinical consultation appointment' })
  @ApiResponse({ status: 201, description: 'Appointment scheduled successfully' })
  async create(@Body() dto: CreateAppointmentDto) {
    const data = await this.appointmentsService.create(dto);
    return {
      statusCode: 201,
      message: 'Appointment scheduled successfully',
      data,
    };
  }

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.RECEPTIONIST, UserRole.PHYSICIAN)
  @ApiOperation({ summary: 'Filter and list appointments' })
  async findAll(@Query() query: AppointmentQueryDto) {
    const data = await this.appointmentsService.findAll(query);
    return {
      statusCode: 200,
      data,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.RECEPTIONIST, UserRole.PHYSICIAN)
  @ApiOperation({ summary: 'Get appointment details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.appointmentsService.findById(id);
    return {
      statusCode: 200,
      data,
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.RECEPTIONIST, UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.APPOINTMENT_UPDATED, resource: 'appointments' })
  @ApiOperation({ summary: 'Update appointment details or status' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    const data = await this.appointmentsService.update(id, dto);
    return {
      statusCode: 200,
      message: 'Appointment updated successfully',
      data,
    };
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMINISTRATOR, UserRole.RECEPTIONIST, UserRole.PHYSICIAN)
  @AuditedAction({ action: AuditAction.APPOINTMENT_CANCELLED, resource: 'appointments' })
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    const data = await this.appointmentsService.cancel(id, reason);
    return {
      statusCode: 200,
      message: 'Appointment cancelled successfully',
      data,
    };
  }
}

