import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CorrectionReason } from '../../../common/constants/enums';
import { Consultation } from '../../consultations/entities/consultation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('consultation_corrections')
export class ConsultationCorrection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'consultation_id' })
  consultationId: string;

  @ManyToOne(() => Consultation, (consultation) => consultation.corrections, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'consultation_id' })
  consultation: Consultation;

  @Index()
  @Column({ type: 'uuid', name: 'corrected_by' })
  correctedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'corrected_by' })
  correctedBy: User;

  @Column({
    type: 'enum',
    enum: CorrectionReason,
  })
  reason: CorrectionReason;

  @Column({ type: 'text', nullable: true, name: 'justification_notes' })
  justificationNotes?: string;

  @Column({ type: 'varchar', length: 100, name: 'field_modified' })
  fieldModified: string;

  @Column({ type: 'text', name: 'original_value' })
  originalValue: string;

  @Column({ type: 'text', name: 'corrected_value' })
  correctedValue: string;

  @Column({ type: 'jsonb', name: 'previous_snapshot' })
  previousSnapshot: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

