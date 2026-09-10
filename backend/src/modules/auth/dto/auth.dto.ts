import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'dr.vance@caresync.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ClinicalSecurePass2026!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class UnlockSessionDto {
  @ApiProperty({ example: 'ClinicalSecurePass2026!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

