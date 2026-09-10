import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ConsultationStatus } from '../../../common/constants/enums';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ConsultationCorrection } from '../../corrections/entities/consultation-correction.entity';

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureCelsius?: number;
  oxygenSaturation?: number;
}

@Entity('consultations')
export class Consultation {
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

  @Column({ type: 'uuid', nullable: true, name: 'appointment_id' })
  appointmentId?: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ type: 'text', name: 'chief_complaint' })
  chiefComplaint: string;

  @Column({ type: 'jsonb', name: 'vital_signs', default: () => "'{}'" })
  vitalSigns: VitalSigns;

  @Column({ type: 'text', name: 'primary_diagnosis_description' })
  primaryDiagnosisDescription: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'primary_diagnosis_code' })
  primaryDiagnosisCode?: string;

  @Column({ type: 'text', name: 'treatment_plan' })
  treatmentPlan: string;

  @Column({
    type: 'enum',
    enum: ConsultationStatus,
    default: ConsultationStatus.DRAFT,
  })
  status: ConsultationStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'finalized_at' })
  finalizedAt?: Date;

  @OneToMany(() => ConsultationCorrection, (correction) => correction.consultation)
  corrections: ConsultationCorrection[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

