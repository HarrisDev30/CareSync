import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

// Entities
import { User } from './modules/users/entities/user.entity';
import { Patient } from './modules/patients/entities/patient.entity';
import { Appointment } from './modules/appointments/entities/appointment.entity';
import { Consultation } from './modules/consultations/entities/consultation.entity';
import { ConsultationCorrection } from './modules/corrections/entities/consultation-correction.entity';
import { DiagnosticOrder } from './modules/diagnostics/entities/diagnostic-order.entity';
import { DiagnosticResult } from './modules/diagnostics/entities/diagnostic-result.entity';
import { AuditLog } from './modules/audit-log/entities/audit-log.entity';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';

// Common Providers
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RolesGuard } from './common/guards/roles.guard';
import { RedisService } from './common/services/redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbHost = configService.get<string>('DB_HOST', 'localhost');
        const isCloudDb =
          dbHost.includes('neon.tech') ||
          dbHost.includes('aws') ||
          configService.get('DB_SSL') === 'true';

        return {
          type: 'postgres',
          host: dbHost,
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USER', 'caresync'),
          password: configService.get<string>('DB_PASSWORD', 'caresync_secure_password_2026'),
          database: configService.get<string>('DB_NAME', 'caresync_db'),
          ssl: isCloudDb ? { rejectUnauthorized: false } : false,
          entities: [
            User,
            Patient,
            Appointment,
            Consultation,
            ConsultationCorrection,
            DiagnosticOrder,
            DiagnosticResult,
            AuditLog,
          ],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: false,
          retryAttempts: 3,
          retryDelay: 1000,
        };
      },
    }),
    AuthModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    ConsultationsModule,
    DiagnosticsModule,
    AuditLogModule,
  ],
  providers: [
    RedisService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
