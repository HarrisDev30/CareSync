import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { DiagnosticOrder } from './entities/diagnostic-order.entity';
import { DiagnosticResult } from './entities/diagnostic-result.entity';
import { DiagnosticStatus, DiagnosticPriority } from '../../common/constants/enums';

describe('DiagnosticsService', () => {
  let service: DiagnosticsService;
  let orderRepo: any;
  let resultRepo: any;

  const mockOrder: any = {
    id: 'ord-1111-1111-1111-111111111111',
    orderCode: 'LAB-2026-00001',
    patientId: 'p1111111-1111-1111-1111-111111111111',
    physicianId: 'doc-uuid-1',
    testName: 'Complete Blood Count',
    priority: DiagnosticPriority.ROUTINE,
    status: DiagnosticStatus.ORDERED,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    orderRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data) => ({ ...data, id: mockOrder.id })),
      save: jest.fn((data) => Promise.resolve({ ...mockOrder, ...data })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    resultRepo = {
      create: jest.fn((data) => ({ id: 'res-uuid-1', ...data })),
      save: jest.fn((data) => Promise.resolve({ id: 'res-uuid-1', ...data })),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosticsService,
        {
          provide: getRepositoryToken(DiagnosticOrder),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(DiagnosticResult),
          useValue: resultRepo,
        },
      ],
    }).compile();

    service = module.get<DiagnosticsService>(DiagnosticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a diagnostic order with ORDERED status and generated order code', async () => {
    const order = await service.createOrder('doc-uuid-1', {
      patientId: mockOrder.patientId,
      testName: 'Lipid Panel',
      priority: DiagnosticPriority.URGENT,
    });

    expect(order.orderCode).toEqual('LAB-2026-00001');
    expect(order.status).toEqual(DiagnosticStatus.ORDERED);
  });

  it('should record laboratory findings and transition status to RESULTED', async () => {
    orderRepo.findOne.mockResolvedValue({ ...mockOrder });

    const result = await service.submitResult(mockOrder.id, 'tech-uuid-1', {
      resultSummary: 'High cholesterol detected',
      findings: { cholesterol: 240 },
      isAbnormal: true,
    });

    expect(result.resultSummary).toEqual('High cholesterol detected');
    expect(result.isAbnormal).toBe(true);
    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DiagnosticStatus.RESULTED,
      }),
    );
  });

  it('should allow supervisor to verify result and transition order to VERIFIED', async () => {
    orderRepo.findOne.mockResolvedValue({
      ...mockOrder,
      status: DiagnosticStatus.RESULTED,
    });
    resultRepo.findOne.mockResolvedValue({
      id: 'res-uuid-1',
      orderId: mockOrder.id,
    });

    const verified = await service.verifyResult(mockOrder.id, 'supervisor-uuid');
    expect(verified.verifiedById).toEqual('supervisor-uuid');
    expect(verified.verifiedAt).toBeDefined();
    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DiagnosticStatus.VERIFIED,
      }),
    );
  });

  it('should allow physician to review result and transition order to REVIEWED', async () => {
    orderRepo.findOne.mockResolvedValue({
      ...mockOrder,
      status: DiagnosticStatus.VERIFIED,
    });
    resultRepo.findOne.mockResolvedValue({
      id: 'res-uuid-1',
      orderId: mockOrder.id,
      verifiedById: 'supervisor-uuid',
    });

    const reviewed = await service.reviewResult(mockOrder.id, 'doc-uuid-1');
    expect(reviewed.reviewedById).toEqual('doc-uuid-1');
    expect(reviewed.reviewedAt).toBeDefined();
    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DiagnosticStatus.REVIEWED,
      }),
    );
  });
});

