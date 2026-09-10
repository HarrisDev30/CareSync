import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DiagnosticOrder } from './entities/diagnostic-order.entity';
import { DiagnosticResult } from './entities/diagnostic-result.entity';
import { CreateDiagnosticOrderDto, SubmitDiagnosticResultDto } from './dto/diagnostic.dto';
import { DiagnosticStatus } from '../../common/constants/enums';

@Injectable()
export class DiagnosticsService {
  constructor(
    @InjectRepository(DiagnosticOrder)
    private readonly orderRepository: Repository<DiagnosticOrder>,
    @InjectRepository(DiagnosticResult)
    private readonly resultRepository: Repository<DiagnosticResult>,
  ) {}

  private async generateOrderCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.orderRepository.count();
    const sequence = String(count + 1).padStart(5, '0');
    return `LAB-${year}-${sequence}`;
  }

  async createOrder(physicianId: string, dto: CreateDiagnosticOrderDto): Promise<DiagnosticOrder> {
    const orderCode = await this.generateOrderCode();
    const order = this.orderRepository.create({
      orderCode,
      patientId: dto.patientId,
      physicianId,
      testName: dto.testName,
      priority: dto.priority,
      clinicalIndication: dto.clinicalIndication,
      status: DiagnosticStatus.ORDERED,
    });

    return await this.orderRepository.save(order);
  }

  async getWorklist(): Promise<DiagnosticOrder[]> {
    return await this.orderRepository.find({
      where: {
        status: In([
          DiagnosticStatus.ORDERED,
          DiagnosticStatus.COLLECTED,
          DiagnosticStatus.IN_ANALYSIS,
        ]),
      },
      relations: ['patient', 'physician'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOrderById(id: string): Promise<DiagnosticOrder> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['patient', 'physician', 'result', 'result.technician', 'result.verifiedBy', 'result.reviewedBy'],
    });

    if (!order) {
      throw new NotFoundException(`Diagnostic order with ID ${id} not found`);
    }

    return order;
  }

  async submitResult(
    orderId: string,
    technicianId: string,
    dto: SubmitDiagnosticResultDto,
  ): Promise<DiagnosticResult> {
    const order = await this.findOrderById(orderId);

    if (order.status === DiagnosticStatus.VERIFIED || order.status === DiagnosticStatus.REVIEWED) {
      throw new BadRequestException('Results for this order have already been verified and locked');
    }

    let result = await this.resultRepository.findOne({ where: { orderId } });

    if (!result) {
      result = this.resultRepository.create({
        orderId,
        technicianId,
        resultSummary: dto.resultSummary,
        findings: dto.findings,
        isAbnormal: dto.isAbnormal,
        fileAttachmentUrl: dto.fileAttachmentUrl,
      });
    } else {
      result.technicianId = technicianId;
      result.resultSummary = dto.resultSummary;
      result.findings = dto.findings;
      result.isAbnormal = dto.isAbnormal;
      result.fileAttachmentUrl = dto.fileAttachmentUrl;
    }

    const savedResult = await this.resultRepository.save(result);

    order.status = DiagnosticStatus.RESULTED;
    await this.orderRepository.save(order);

    return savedResult;
  }

  async verifyResult(orderId: string, supervisorId: string): Promise<DiagnosticResult> {
    const order = await this.findOrderById(orderId);
    const result = await this.resultRepository.findOne({ where: { orderId } });

    if (!result) {
      throw new BadRequestException('No laboratory findings have been recorded for this order yet');
    }

    result.verifiedById = supervisorId;
    result.verifiedAt = new Date();
    const saved = await this.resultRepository.save(result);

    order.status = DiagnosticStatus.VERIFIED;
    await this.orderRepository.save(order);

    return saved;
  }

  async reviewResult(orderId: string, physicianId: string): Promise<DiagnosticResult> {
    const order = await this.findOrderById(orderId);
    const result = await this.resultRepository.findOne({ where: { orderId } });

    if (!result) {
      throw new BadRequestException('Cannot review an order that has no resulted findings');
    }

    result.reviewedById = physicianId;
    result.reviewedAt = new Date();
    const saved = await this.resultRepository.save(result);

    order.status = DiagnosticStatus.REVIEWED;
    await this.orderRepository.save(order);

    return saved;
  }
}

