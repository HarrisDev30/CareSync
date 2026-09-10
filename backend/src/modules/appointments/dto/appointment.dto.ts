import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType, AppointmentStatus } from '../../../common/constants/enums';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'e4f5a6b7-8901-2345-6789-0123456789ab' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ example: 'c7a8b9e0-1234-5678-90ab-cdef12345678' })
  @IsUUID()
  physicianId: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  parentAppointmentId?: string;

  @ApiPropertyOptional({ enum: AppointmentType, default: AppointmentType.GENERAL_CONSULTATION })
  @IsOptional()
  @IsEnum(AppointmentType)
  appointmentType?: AppointmentType;

  @ApiProperty({ example: '2026-09-10T09:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-09-10T09:30:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 'Routine checkup and persistent dry cough' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: '2026-09-10T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-09-10T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 'Updated reason for visit' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AppointmentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  physicianId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

