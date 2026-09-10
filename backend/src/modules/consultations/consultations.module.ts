import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultation } from './entities/consultation.entity';
import { ConsultationCorrection } from '../corrections/entities/consultation-correction.entity';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { RedisService } from '../../common/services/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Consultation, ConsultationCorrection])],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, RedisService],
  exports: [ConsultationsService, TypeOrmModule],
})
export class ConsultationsModule {}

