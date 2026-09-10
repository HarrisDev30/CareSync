import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { Consultation } from './entities/consultation.entity';
import { ConsultationCorrection } from '../corrections/entities/consultation-correction.entity';
import { ConsultationStatus, CorrectionReason } from '../../common/constants/enums';

describe('ConsultationsService', () => {
  let service: ConsultationsService;
  let consultationRepo: any;
  let correctionRepo: any;
  let dataSource: any;

  const mockConsultation: any = {
    id: 'c1111111-1111-1111-1111-111111111111',
    patientId: 'p1111111-1111-1111-1111-111111111111',
    physicianId: 'doc-uuid-1',
    chiefComplaint: 'Fever and chills',
    vitalSigns: { heartRate: 88 },
    primaryDiagnosisDescription: 'Viral syndrome',
    treatmentPlan: 'Hydration and rest',
    status: ConsultationStatus.DRAFT,
    corrections: [],
  };

  beforeEach(async () => {
    consultationRepo = {
      create: jest.fn((dto) => ({ ...mockConsultation, ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    correctionRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'corr-uuid-1', ...entity })),
    };

    dataSource = {
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationsService,
        {
          provide: getRepositoryToken(Consultation),
          useValue: consultationRepo,
        },
        {
          provide: getRepositoryToken(ConsultationCorrection),
          useValue: correctionRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<ConsultationsService>(ConsultationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create and update', () => {
    it('should create a consultation with DRAFT status', async () => {
      const result = await service.create('doc-uuid-1', {
        patientId: 'p1111111-1111-1111-1111-111111111111',
        chiefComplaint: 'Fever',
        primaryDiagnosisDescription: 'Suspected flu',
        treatmentPlan: 'Rest',
      });

      expect(result.status).toEqual(ConsultationStatus.DRAFT);
      expect(result.physicianId).toEqual('doc-uuid-1');
    });

    it('should allow direct update while in DRAFT status', async () => {
      consultationRepo.findOne.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.DRAFT,
      });

      const updated = await service.update(mockConsultation.id, 'doc-uuid-1', {
        primaryDiagnosisDescription: 'Confirmed Influenza A',
      });

      expect(updated.primaryDiagnosisDescription).toEqual('Confirmed Influenza A');
    });

    it('should reject direct update if consultation is FINALIZED', async () => {
      consultationRepo.findOne.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.FINALIZED,
      });

      await expect(
        service.update(mockConsultation.id, 'doc-uuid-1', {
          primaryDiagnosisDescription: 'Illegal Overwrite',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject update if caller is not the authoring physician', async () => {
      consultationRepo.findOne.mockResolvedValue({
        ...mockConsultation,
        physicianId: 'doc-uuid-1',
        status: ConsultationStatus.DRAFT,
      });

      await expect(
        service.update(mockConsultation.id, 'doc-uuid-2', {
          primaryDiagnosisDescription: 'Unauthorized edit',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('finalize', () => {
    it('should finalize and seal a draft consultation', async () => {
      consultationRepo.findOne.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.DRAFT,
      });

      const finalized = await service.finalize(mockConsultation.id, 'doc-uuid-1');
      expect(finalized.status).toEqual(ConsultationStatus.FINALIZED);
      expect(finalized.finalizedAt).toBeDefined();
    });
  });

  describe('safe record corrections (append-only revision seam)', () => {
    it('should reject correction if consultation is still in DRAFT', async () => {
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn().mockResolvedValue({
            ...mockConsultation,
            status: ConsultationStatus.DRAFT,
          }),
        },
      };
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      await expect(
        service.submitCorrection(mockConsultation.id, 'doc-uuid-1', {
          reason: CorrectionReason.DIAGNOSTIC_REVISION,
          fieldModified: 'primaryDiagnosisDescription',
          correctedValue: 'New Value',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should amend a finalized consultation, record snapshot, and set status to AMENDED', async () => {
      const finalizedRecord = {
        ...mockConsultation,
        status: ConsultationStatus.FINALIZED,
        primaryDiagnosisDescription: 'Original Diagnosis',
      };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn().mockResolvedValue(finalizedRecord),
          create: jest.fn((entity, val) => val),
          save: jest.fn((val) => Promise.resolve(val)),
        },
      };
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      const result = await service.submitCorrection(mockConsultation.id, 'doc-uuid-1', {
        reason: CorrectionReason.DIAGNOSTIC_REVISION,
        justificationNotes: 'Lab confirmed bacterial strain',
        fieldModified: 'primaryDiagnosisDescription',
        correctedValue: 'Bacterial Pneumonia',
      });

      expect(result.consultation.status).toEqual(ConsultationStatus.AMENDED);
      expect(result.consultation.primaryDiagnosisDescription).toEqual('Bacterial Pneumonia');
      expect(result.correction.originalValue).toEqual('Original Diagnosis');
      expect(result.correction.correctedValue).toEqual('Bacterial Pneumonia');
      expect(result.correction.previousSnapshot).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});

