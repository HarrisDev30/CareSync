import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CorrectionReason } from '../../../common/constants/enums';

export class VitalSignsDto {
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({ example: 16 })
  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @ApiPropertyOptional({ example: 36.8 })
  @IsOptional()
  @IsNumber()
  temperatureCelsius?: number;

  @ApiPropertyOptional({ example: 98 })
  @IsOptional()
  @IsNumber()
  oxygenSaturation?: number;
}

export class CreateConsultationDto {
  @ApiProperty({ example: 'e4f5a6b7-8901-2345-6789-0123456789ab' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ example: 'Shortness of breath and fever for 3 days' })
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  @ApiPropertyOptional({ type: VitalSignsDto })
  @IsOptional()
  @IsObject()
  vitalSigns?: VitalSignsDto;

  @ApiProperty({ example: 'Community-acquired pneumonia' })
  @IsString()
  @IsNotEmpty()
  primaryDiagnosisDescription: string;

  @ApiPropertyOptional({ example: 'J18.9' })
  @IsOptional()
  @IsString()
  primaryDiagnosisCode?: string;

  @ApiProperty({ example: 'Amoxicillin 500mg TID for 7 days, chest X-ray follow-up' })
  @IsString()
  @IsNotEmpty()
  treatmentPlan: string;
}

export class UpdateConsultationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ type: VitalSignsDto })
  @IsOptional()
  @IsObject()
  vitalSigns?: VitalSignsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryDiagnosisDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryDiagnosisCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatmentPlan?: string;
}

export class CreateCorrectionDto {
  @ApiProperty({ enum: CorrectionReason, example: CorrectionReason.DIAGNOSTIC_REVISION })
  @IsEnum(CorrectionReason)
  reason: CorrectionReason;

  @ApiPropertyOptional({ example: 'Sputum culture confirmed bacterial etiology' })
  @IsOptional()
  @IsString()
  justificationNotes?: string;

  @ApiProperty({ example: 'primaryDiagnosisDescription' })
  @IsString()
  @IsNotEmpty()
  fieldModified: string;

  @ApiProperty({ example: 'Bacterial lobar pneumonia' })
  @IsString()
  @IsNotEmpty()
  correctedValue: string;
}

