import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Gender } from '../../../common/constants/enums';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30, unique: true })
  mrn: string;

  @Index()
  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Index()
  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Index()
  @Column({ type: 'date', name: 'date_of_birth' })
  dateOfBirth: string;

  @Column({
    type: 'enum',
    enum: Gender,
    default: Gender.UNKNOWN,
  })
  gender: Gender;

  @Column({ type: 'varchar', length: 5, nullable: true, name: 'blood_type' })
  bloodType?: string;

  @Column({ type: 'text', nullable: true, name: 'national_id_encrypted' })
  nationalIdEncrypted?: string;

  @Column({ type: 'text', nullable: true, name: 'phone_encrypted' })
  phoneEncrypted?: string;

  @Column({ type: 'text', nullable: true, name: 'email_encrypted' })
  emailEncrypted?: string;

  @Column({ type: 'text', nullable: true, name: 'address_encrypted' })
  addressEncrypted?: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'emergency_contact_name' })
  emergencyContactName?: string;

  @Column({ type: 'text', nullable: true, name: 'emergency_contact_phone_encrypted' })
  emergencyContactPhoneEncrypted?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'known_allergies', default: () => "'[]'" })
  knownAllergies: string[];

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}

