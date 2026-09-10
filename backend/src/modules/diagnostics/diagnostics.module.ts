import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosticOrder } from './entities/diagnostic-order.entity';
import { DiagnosticResult } from './entities/diagnostic-result.entity';
import { DiagnosticsService } from './diagnostics.service';
import { DiagnosticsController } from './diagnostics.controller';
import { RedisService } from '../../common/services/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiagnosticOrder, DiagnosticResult])],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService, RedisService],
  exports: [DiagnosticsService, TypeOrmModule],
})
export class DiagnosticsModule {}

