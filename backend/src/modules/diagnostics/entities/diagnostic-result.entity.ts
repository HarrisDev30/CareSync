import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DiagnosticOrder } from './diagnostic-order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('diagnostic_results')
export class DiagnosticResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true, name: 'order_id' })
  orderId: string;

  @OneToOne(() => DiagnosticOrder, (order) => order.result, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: DiagnosticOrder;

  @Index()
  @Column({ type: 'uuid', name: 'technician_id' })
  technicianId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'technician_id' })
  technician: User;

  @Column({ type: 'text', name: 'result_summary' })
  resultSummary: string;

  @Column({ type: 'jsonb', name: 'findings', default: () => "'{}'" })
  findings: Record<string, any>;

  @Index()
  @Column({ type: 'boolean', default: false, name: 'is_abnormal' })
  isAbnormal: boolean;

  @Column({ type: 'text', nullable: true, name: 'file_attachment_url' })
  fileAttachmentUrl?: string;

  @Column({ type: 'uuid', nullable: true, name: 'verified_by' })
  verifiedById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifiedBy?: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'verified_at' })
  verifiedAt?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy?: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

