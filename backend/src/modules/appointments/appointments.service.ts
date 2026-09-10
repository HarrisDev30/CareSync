import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto, UpdateAppointmentDto, AppointmentQueryDto } from './dto/appointment.dto';
import { AppointmentStatus } from '../../common/constants/enums';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (end <= start) {
      throw new BadRequestException('Appointment end time must be after start time');
    }

    const appointment = this.appointmentRepository.create({
      patientId: dto.patientId,
      physicianId: dto.physicianId,
      parentAppointmentId: dto.parentAppointmentId,
      appointmentType: dto.appointmentType,
      startTime: start,
      endTime: end,
      reason: dto.reason,
      status: AppointmentStatus.SCHEDULED,
    });

    return await this.appointmentRepository.save(appointment);
  }

  async findAll(query: AppointmentQueryDto): Promise<Appointment[]> {
    const where: FindOptionsWhere<Appointment> = {};

    if (query.patientId) where.patientId = query.patientId;
    if (query.physicianId) where.physicianId = query.physicianId;
    if (query.status) where.status = query.status;

    if (query.fromDate && query.toDate) {
      where.startTime = Between(new Date(query.fromDate), new Date(query.toDate));
    }

    return await this.appointmentRepository.find({
      where,
      relations: ['patient', 'physician', 'parentAppointment'],
      order: { startTime: 'ASC' },
    });
  }

  async findById(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient', 'physician', 'parentAppointment'],
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.findById(id);

    if (dto.startTime && dto.endTime) {
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      if (end <= start) {
        throw new BadRequestException('End time must be after start time');
      }
      appointment.startTime = start;
      appointment.endTime = end;
    }

    if (dto.status) appointment.status = dto.status;
    if (dto.reason) appointment.reason = dto.reason;

    return await this.appointmentRepository.save(appointment);
  }

  async cancel(id: string, reason?: string): Promise<Appointment> {
    const appointment = await this.findById(id);
    appointment.status = AppointmentStatus.CANCELLED;
    if (reason) {
      appointment.reason = `${appointment.reason} [Cancelled: ${reason}]`;
    }
    return await this.appointmentRepository.save(appointment);
  }
}

