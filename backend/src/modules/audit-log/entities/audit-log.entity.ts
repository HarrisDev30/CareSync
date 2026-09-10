import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditAction } from '../../../common/constants/enums';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @PrimaryGeneratedColumn('uuid', { name: 'log_uuid' })
  logUuid: string;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index()
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Index()
  @Column({ type: 'varchar', length: 100, name: 'resource_entity' })
  resourceEntity: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'resource_id' })
  resourceId?: string;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @Column({ type: 'boolean', default: true, name: 'is_authorized' })
  isAuthorized: boolean;

  @Column({ type: 'jsonb', name: 'details', default: () => "'{}'" })
  details: Record<string, any>;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

