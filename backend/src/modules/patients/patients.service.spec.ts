import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { Patient } from './entities/patient.entity';
import { CryptoService } from './services/crypto.service';
import { UserRole, Gender } from '../../common/constants/enums';

describe('PatientsService', () => {
  let service: PatientsService;
  let patientRepo: any;
  let cryptoService: CryptoService;

  const mockPatient: any = {
    id: 'p1111111-1111-1111-1111-111111111111',
    mrn: 'CS-2026-000001',
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    dateOfBirth: '1988-04-12',
    gender: Gender.FEMALE,
    bloodType: 'A+',
    nationalIdEncrypted: 'mock-enc-nid',
    phoneEncrypted: 'mock-enc-phone',
    emailEncrypted: 'mock-enc-email',
    addressEncrypted: 'mock-enc-addr',
    emergencyContactName: 'John Doe',
    emergencyContactPhoneEncrypted: 'mock-enc-ephone',
    knownAllergies: ['Penicillin'],
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    patientRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data) => ({ ...data, id: mockPatient.id, createdAt: mockPatient.createdAt })),
      save: jest.fn((data) => Promise.resolve({ ...mockPatient, ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: getRepositoryToken(Patient),
          useValue: patientRepo,
        },
        {
          provide: CryptoService,
          useValue: {
            encrypt: jest.fn((val) => `enc:${val}`),
            decrypt: jest.fn((val) => val.replace('enc:', '')),
            maskNationalId: jest.fn(() => 'XXX-XX-1234'),
            maskPhone: jest.fn(() => '(***) ***-8821'),
          },
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should register patient with auto-generated MRN and encrypted PHI', async () => {
      const result = await service.create({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1988-04-12',
        gender: Gender.FEMALE,
        bloodType: 'A+',
        nationalId: '123-45-6789',
        phoneNumber: '+1-555-019-8821',
        email: 'jane.doe@example.com',
        address: '742 Evergreen Terrace',
      });

      expect(result.mrn).toEqual('CS-2026-000001');
      expect(result.maskedNationalId).toEqual('XXX-XX-1234');
      expect(cryptoService.encrypt).toHaveBeenCalledWith('123-45-6789');
      expect(cryptoService.encrypt).toHaveBeenCalledWith('+1-555-019-8821');
    });
  });

  describe('findById role-based masking', () => {
    it('should return decrypted contact details to a Physician', async () => {
      patientRepo.findOne.mockResolvedValue({
        ...mockPatient,
        phoneEncrypted: 'enc:+1-555-019-8821',
        emailEncrypted: 'enc:jane@example.com',
        addressEncrypted: 'enc:Springfield',
      });

      const result = await service.findById(mockPatient.id, UserRole.PHYSICIAN);
      expect(result.contact.phoneNumber).toEqual('+1-555-019-8821');
      expect(result.contact.email).toEqual('jane@example.com');
    });

    it('should return masked phone to a Laboratory User', async () => {
      patientRepo.findOne.mockResolvedValue({
        ...mockPatient,
        phoneEncrypted: 'enc:+1-555-019-8821',
      });

      const result = await service.findById(mockPatient.id, UserRole.LABORATORY_USER);
      expect(result.contact.maskedPhone).toEqual('(***) ***-8821');
      expect(result.contact.phoneNumber).toBeUndefined();
    });
  });

  describe('softDelete', () => {
    it('should soft delete patient and set isActive to false', async () => {
      patientRepo.findOne.mockResolvedValue({ ...mockPatient });

      const result = await service.softDelete(mockPatient.id);
      expect(result.message).toContain('soft-deleted');
      expect(patientRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      );
    });
  });
});

