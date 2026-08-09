import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { HolidayCalendarEntity } from '@/modules/country-config/entities/holiday-calendar.entity';
import { HolidayEntity } from '@/modules/country-config/entities/holiday.entity';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { LeaveAccrualMethod } from '@/modules/country-config/enums/setup-wizard.enum';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateHolidayAdminDto,
  CreateHolidayCalendarAdminDto,
  CreateLeaveTypeAdminDto,
  UpdateHolidayAdminDto,
  UpdateHolidayCalendarAdminDto,
  UpdateLeaveTypeAdminDto,
} from './dto/leave-admin.dto';

function toDecimalString(value: number | undefined, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }
  return String(value);
}

@Injectable()
export class LeaveAdminService {
  constructor(
    @InjectRepository(LeaveTypeEntity)
    private readonly leaveTypeRepository: Repository<LeaveTypeEntity>,
    @InjectRepository(HolidayCalendarEntity)
    private readonly holidayCalendarRepository: Repository<HolidayCalendarEntity>,
    @InjectRepository(HolidayEntity)
    private readonly holidayRepository: Repository<HolidayEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  listLeaveTypes(tenantId: string): Promise<LeaveTypeEntity[]> {
    return this.leaveTypeRepository.find({
      where: { tenantId },
      order: { countryCode: 'ASC', name: 'ASC' },
    });
  }

  async getLeaveType(id: string, tenantId: string): Promise<LeaveTypeEntity> {
    const row = await this.leaveTypeRepository.findOne({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'LEAVE_TYPE_NOT_FOUND',
        message: 'Leave type not found',
      });
    }
    return row;
  }

  async createLeaveType(
    dto: CreateLeaveTypeAdminDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<LeaveTypeEntity> {
    const existing = await this.leaveTypeRepository.findOne({
      where: {
        tenantId,
        countryCode: dto.countryCode,
        code: dto.code,
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'LEAVE_TYPE_EXISTS',
        message: 'A leave type with this code already exists for the country',
      });
    }

    const row = await this.leaveTypeRepository.save(
      this.leaveTypeRepository.create({
        tenantId,
        countryCode: dto.countryCode,
        code: dto.code,
        name: dto.name,
        accrualMethod: dto.accrualMethod ?? LeaveAccrualMethod.ANNUAL,
        daysPerYear: toDecimalString(dto.daysPerYear, '0'),
        carryForwardCap: toDecimalString(dto.carryForwardCap, '0'),
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'leave_type.create',
      entityType: 'leave_type',
      entityId: row.id,
      changes: {
        code: { old: null, new: row.code },
        name: { old: null, new: row.name },
        countryCode: { old: null, new: row.countryCode },
      },
      correlationId,
      ipAddress,
    });

    return row;
  }

  async updateLeaveType(
    id: string,
    dto: UpdateLeaveTypeAdminDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<LeaveTypeEntity> {
    const row = await this.getLeaveType(id, tenantId);
    const before = {
      name: row.name,
      code: row.code,
      countryCode: row.countryCode,
      accrualMethod: row.accrualMethod,
      daysPerYear: row.daysPerYear,
      carryForwardCap: row.carryForwardCap,
    };

    if (dto.countryCode !== undefined) row.countryCode = dto.countryCode;
    if (dto.code !== undefined) row.code = dto.code;
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.accrualMethod !== undefined) row.accrualMethod = dto.accrualMethod;
    if (dto.daysPerYear !== undefined) {
      row.daysPerYear = toDecimalString(dto.daysPerYear, row.daysPerYear);
    }
    if (dto.carryForwardCap !== undefined) {
      row.carryForwardCap = toDecimalString(
        dto.carryForwardCap,
        row.carryForwardCap,
      );
    }

    if (
      (dto.countryCode !== undefined || dto.code !== undefined) &&
      (row.countryCode !== before.countryCode || row.code !== before.code)
    ) {
      const clash = await this.leaveTypeRepository.findOne({
        where: {
          tenantId,
          countryCode: row.countryCode,
          code: row.code,
        },
      });
      if (clash && clash.id !== row.id) {
        throw new ConflictException({
          code: 'LEAVE_TYPE_EXISTS',
          message: 'A leave type with this code already exists for the country',
        });
      }
    }

    const saved = await this.leaveTypeRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'leave_type.update',
      entityType: 'leave_type',
      entityId: saved.id,
      changes: {
        name: { old: before.name, new: saved.name },
        code: { old: before.code, new: saved.code },
        countryCode: { old: before.countryCode, new: saved.countryCode },
        accrualMethod: {
          old: before.accrualMethod,
          new: saved.accrualMethod,
        },
        daysPerYear: { old: before.daysPerYear, new: saved.daysPerYear },
        carryForwardCap: {
          old: before.carryForwardCap,
          new: saved.carryForwardCap,
        },
      },
      correlationId,
      ipAddress,
    });
    return saved;
  }

  listHolidayCalendars(tenantId: string): Promise<HolidayCalendarEntity[]> {
    return this.holidayCalendarRepository.find({
      where: { tenantId },
      relations: ['holidays'],
      order: { countryCode: 'ASC', effectiveYear: 'DESC' },
    });
  }

  async getHolidayCalendar(
    id: string,
    tenantId: string,
  ): Promise<HolidayCalendarEntity> {
    const row = await this.holidayCalendarRepository.findOne({
      where: { id, tenantId },
      relations: ['holidays'],
    });
    if (!row) {
      throw new NotFoundException({
        code: 'HOLIDAY_CALENDAR_NOT_FOUND',
        message: 'Holiday calendar not found',
      });
    }
    return row;
  }

  async createHolidayCalendar(
    dto: CreateHolidayCalendarAdminDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<HolidayCalendarEntity> {
    const existing = await this.holidayCalendarRepository.findOne({
      where: {
        tenantId,
        countryCode: dto.countryCode,
        effectiveYear: dto.effectiveYear,
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'HOLIDAY_CALENDAR_EXISTS',
        message:
          'A holiday calendar already exists for this country and year',
      });
    }

    const row = await this.holidayCalendarRepository.save(
      this.holidayCalendarRepository.create({
        tenantId,
        countryCode: dto.countryCode,
        name: dto.name,
        effectiveYear: dto.effectiveYear,
        isActive: dto.isActive ?? true,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'holiday_calendar.create',
      entityType: 'holiday_calendar',
      entityId: row.id,
      changes: {
        name: { old: null, new: row.name },
        countryCode: { old: null, new: row.countryCode },
        effectiveYear: { old: null, new: row.effectiveYear },
      },
      correlationId,
      ipAddress,
    });

    return this.getHolidayCalendar(row.id, tenantId);
  }

  async updateHolidayCalendar(
    id: string,
    dto: UpdateHolidayCalendarAdminDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<HolidayCalendarEntity> {
    const row = await this.getHolidayCalendar(id, tenantId);
    const before = { name: row.name, isActive: row.isActive };
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    const saved = await this.holidayCalendarRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'holiday_calendar.update',
      entityType: 'holiday_calendar',
      entityId: saved.id,
      changes: {
        name: { old: before.name, new: saved.name },
        isActive: { old: before.isActive, new: saved.isActive },
      },
      correlationId,
      ipAddress,
    });
    return this.getHolidayCalendar(saved.id, tenantId);
  }

  async createHoliday(
    calendarId: string,
    dto: CreateHolidayAdminDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<HolidayEntity> {
    await this.getHolidayCalendar(calendarId, tenantId);

    const existing = await this.holidayRepository.findOne({
      where: {
        tenantId,
        holidayCalendarId: calendarId,
        holidayDate: dto.holidayDate,
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'HOLIDAY_EXISTS',
        message: 'A holiday already exists on this date for the calendar',
      });
    }

    const row = await this.holidayRepository.save(
      this.holidayRepository.create({
        tenantId,
        holidayCalendarId: calendarId,
        name: dto.name,
        holidayDate: dto.holidayDate,
        isCompanyClosure: dto.isCompanyClosure ?? false,
        isOptionalWorking: dto.isOptionalWorking ?? false,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'holiday.create',
      entityType: 'holiday',
      entityId: row.id,
      changes: {
        name: { old: null, new: row.name },
        holidayDate: { old: null, new: row.holidayDate },
        holidayCalendarId: { old: null, new: calendarId },
      },
      correlationId,
      ipAddress,
    });

    return row;
  }

  async updateHoliday(
    id: string,
    dto: UpdateHolidayAdminDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<HolidayEntity> {
    const row = await this.holidayRepository.findOne({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'HOLIDAY_NOT_FOUND',
        message: 'Holiday not found',
      });
    }

    const before = {
      name: row.name,
      holidayDate: row.holidayDate,
      isCompanyClosure: row.isCompanyClosure,
      isOptionalWorking: row.isOptionalWorking,
    };

    if (dto.name !== undefined) row.name = dto.name;
    if (dto.holidayDate !== undefined) row.holidayDate = dto.holidayDate;
    if (dto.isCompanyClosure !== undefined) {
      row.isCompanyClosure = dto.isCompanyClosure;
    }
    if (dto.isOptionalWorking !== undefined) {
      row.isOptionalWorking = dto.isOptionalWorking;
    }

    const saved = await this.holidayRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'holiday.update',
      entityType: 'holiday',
      entityId: saved.id,
      changes: {
        name: { old: before.name, new: saved.name },
        holidayDate: { old: before.holidayDate, new: saved.holidayDate },
        isCompanyClosure: {
          old: before.isCompanyClosure,
          new: saved.isCompanyClosure,
        },
        isOptionalWorking: {
          old: before.isOptionalWorking,
          new: saved.isOptionalWorking,
        },
      },
      correlationId,
      ipAddress,
    });
    return saved;
  }
}
