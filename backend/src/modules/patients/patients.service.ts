import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto, UpdatePatientDto, PatientSearchQueryDto } from './dto/patient.dto';
import { CryptoService } from './services/crypto.service';
import { UserRole } from '../../common/constants/enums';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly cryptoService: CryptoService,
  ) {}

  private async generateMrn(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.patientRepository.count();
    const sequence = String(count + 1).padStart(6, '0');
    return `CS-${year}-${sequence}`;
  }

  async create(dto: CreatePatientDto) {
    const mrn = await this.generateMrn();

    // Encrypt sensitive PHI fields at rest
    const nationalIdEncrypted = this.cryptoService.encrypt(dto.nationalId);
    const phoneEncrypted = this.cryptoService.encrypt(dto.phoneNumber);
    const emailEncrypted = this.cryptoService.encrypt(dto.email);
    const addressEncrypted = this.cryptoService.encrypt(dto.address);
    const emergencyContactPhoneEncrypted = dto.emergencyContactPhone
      ? this.cryptoService.encrypt(dto.emergencyContactPhone)
      : undefined;

    const patient = this.patientRepository.create({
      mrn,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      bloodType: dto.bloodType,
      nationalIdEncrypted,
      phoneEncrypted,
      emailEncrypted,
      addressEncrypted,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactPhoneEncrypted,
      knownAllergies: dto.knownAllergies || [],
      isActive: true,
    });

    const saved = await this.patientRepository.save(patient);

    return {
      id: saved.id,
      mrn: saved.mrn,
      firstName: saved.firstName,
      lastName: saved.lastName,
      dateOfBirth: saved.dateOfBirth,
      gender: saved.gender,
      bloodType: saved.bloodType,
      maskedNationalId: this.cryptoService.maskNationalId(dto.nationalId),
      knownAllergies: saved.knownAllergies,
      createdAt: saved.createdAt,
    };
  }

  async findAll(query: PatientSearchQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const queryBuilder = this.patientRepository.createQueryBuilder('patient')
      .where('patient.deletedAt IS NULL');

    if (query.query) {
      const q = `%${query.query.trim()}%`;
      queryBuilder.andWhere(
        '(patient.mrn ILIKE :q OR patient.firstName ILIKE :q OR patient.lastName ILIKE :q)',
        { q },
      );
    }

    if (query.dob) {
      queryBuilder.andWhere('patient.dateOfBirth = :dob', { dob: query.dob });
    }

    queryBuilder.orderBy('patient.createdAt', 'DESC').skip(skip).take(limit);

    const [patients, total] = await queryBuilder.getManyAndCount();

    const items = patients.map((p) => {
      let decryptedPhone = '';
      if (p.phoneEncrypted) {
        try {
          decryptedPhone = this.cryptoService.decrypt(p.phoneEncrypted);
        } catch {}
      }

      return {
        id: p.id,
        mrn: p.mrn,
        fullName: p.fullName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        bloodType: p.bloodType,
        maskedPhone: decryptedPhone ? this.cryptoService.maskPhone(decryptedPhone) : '',
        createdAt: p.createdAt,
      };
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, role: UserRole) {
    const patient = await this.patientRepository.findOne({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    // Role-based access control on sensitive contact details
    const canViewFullDetails =
      role === UserRole.PHYSICIAN || role === UserRole.RECEPTIONIST || role === UserRole.ADMINISTRATOR;

    let contact: any = null;

    if (canViewFullDetails) {
      contact = {
        phoneNumber: patient.phoneEncrypted ? this.cryptoService.decrypt(patient.phoneEncrypted) : '',
        email: patient.emailEncrypted ? this.cryptoService.decrypt(patient.emailEncrypted) : '',
        address: patient.addressEncrypted ? this.cryptoService.decrypt(patient.addressEncrypted) : '',
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhoneEncrypted
          ? this.cryptoService.decrypt(patient.emergencyContactPhoneEncrypted)
          : '',
      };
    } else {
      // Masked for laboratory users
      const rawPhone = patient.phoneEncrypted ? this.cryptoService.decrypt(patient.phoneEncrypted) : '';
      contact = {
        maskedPhone: rawPhone ? this.cryptoService.maskPhone(rawPhone) : '',
      };
    }

    return {
      id: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodType: patient.bloodType,
      contact,
      knownAllergies: patient.knownAllergies,
      isActive: patient.isActive,
      createdAt: patient.createdAt,
    };
  }

  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.patientRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    if (dto.firstName) patient.firstName = dto.firstName;
    if (dto.lastName) patient.lastName = dto.lastName;
    if (dto.dateOfBirth) patient.dateOfBirth = dto.dateOfBirth;
    if (dto.gender) patient.gender = dto.gender;
    if (dto.bloodType) patient.bloodType = dto.bloodType;
    if (dto.knownAllergies) patient.knownAllergies = dto.knownAllergies;

    if (dto.phoneNumber) {
      patient.phoneEncrypted = this.cryptoService.encrypt(dto.phoneNumber);
    }
    if (dto.email) {
      patient.emailEncrypted = this.cryptoService.encrypt(dto.email);
    }
    if (dto.address) {
      patient.addressEncrypted = this.cryptoService.encrypt(dto.address);
    }

    return await this.patientRepository.save(patient);
  }

  async softDelete(id: string) {
    const patient = await this.patientRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    patient.isActive = false;
    patient.deletedAt = new Date();
    await this.patientRepository.save(patient);

    return { message: `Patient ${patient.mrn} soft-deleted successfully` };
  }
}

