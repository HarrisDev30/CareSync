import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiagnosticPriority } from '../../../common/constants/enums';

export class CreateDiagnosticOrderDto {
  @ApiProperty({ example: 'e4f5a6b7-8901-2345-6789-0123456789ab' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ example: 'Complete Blood Count (CBC)' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiPropertyOptional({ enum: DiagnosticPriority, default: DiagnosticPriority.ROUTINE })
  @IsOptional()
  @IsEnum(DiagnosticPriority)
  priority?: DiagnosticPriority;

  @ApiPropertyOptional({ example: 'Suspected bacterial infection / anemia' })
  @IsOptional()
  @IsString()
  clinicalIndication?: string;
}

export class SubmitDiagnosticResultDto {
  @ApiProperty({ example: 'Marked leukocytosis with elevated neutrophil count.' })
  @IsString()
  @IsNotEmpty()
  resultSummary: string;

  @ApiProperty({
    example: {
      wbc: { value: 16.5, unit: '10^3/uL', referenceRange: '4.5-11.0', flag: 'HIGH' },
      hgb: { value: 13.8, unit: 'g/dL', referenceRange: '12.0-16.0', flag: 'NORMAL' },
      plt: { value: 250, unit: '10^3/uL', referenceRange: '150-450', flag: 'NORMAL' },
    },
  })
  @IsObject()
  findings: Record<string, any>;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAbnormal: boolean;

  @ApiPropertyOptional({ example: 'https://s3.caresync.internal/lab-reports/lab-2026-00012.pdf' })
  @IsOptional()
  @IsString()
  fileAttachmentUrl?: string;
}

