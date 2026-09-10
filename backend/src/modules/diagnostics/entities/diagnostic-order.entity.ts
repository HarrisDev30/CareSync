import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DiagnosticPriority, DiagnosticStatus } from '../../../common/constants/enums';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { DiagnosticResult } from './diagnostic-result.entity';

@Entity('diagnostic_orders')
export class DiagnosticOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30, unique: true, name: 'order_code' })
  orderCode: string;

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

  @Column({ type: 'varchar', length: 150, name: 'test_name' })
  testName: string;

  @Column({
    type: 'enum',
    enum: DiagnosticPriority,
    default: DiagnosticPriority.ROUTINE,
  })
  priority: DiagnosticPriority;

  @Column({
    type: 'enum',
    enum: DiagnosticStatus,
    default: DiagnosticStatus.ORDERED,
  })
  status: DiagnosticStatus;

  @Column({ type: 'text', nullable: true, name: 'clinical_indication' })
  clinicalIndication?: string;

  @OneToOne(() => DiagnosticResult, (result) => result.order)
  result?: DiagnosticResult;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

