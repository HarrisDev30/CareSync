import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppointmentType, AppointmentStatus } from '../../../common/constants/enums';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'patient_id' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Index()
  @Column({ type: 'uuid', name: 'physician_id' })
  physicianId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'physician_id' })
  physician: User;

  @Column({ type: 'uuid', nullable: true, name: 'parent_appointment_id' })
  parentAppointmentId?: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_appointment_id' })
  parentAppointment?: Appointment;

  @Column({
    type: 'enum',
    enum: AppointmentType,
    default: AppointmentType.GENERAL_CONSULTATION,
    name: 'appointment_type',
  })
  appointmentType: AppointmentType;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Index()
  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime: Date;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

