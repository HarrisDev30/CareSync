import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

// Entities
import { User } from './modules/users/entities/user.entity';
import { AuditLog } from './modules/audit-log/entities/audit-log.entity';
import { Patient } from './modules/patients/entities/patient.entity';
import { Consultation } from './modules/consultations/entities/consultation.entity';
import { ConsultationCorrection } from './modules/corrections/entities/consultation-correction.entity';
import { Appointment } from './modules/appointments/entities/appointment.entity';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';

// Common Providers
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RedisService } from './common/services/redis.service';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'caresync'),
        password: configService.get<string>('DB_PASSWORD', 'caresync_secure_password_2026'),
        database: configService.get<string>('DB_NAME', 'caresync_db'),
        entities: [
          User,
          AuditLog,
          Patient,
          Consultation,
          ConsultationCorrection,
          Appointment,
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: false,
        retryAttempts: 2,
        retryDelay: 1000,
      }),
    }),
    AuthModule,
    UsersModule,
    AuditLogModule,
    PatientsModule,
    ConsultationsModule,
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
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
