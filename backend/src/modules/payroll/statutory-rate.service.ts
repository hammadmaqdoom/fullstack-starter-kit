import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogChanges } from '@/modules/compliance/entities/audit-log.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import {
  CreateStatutoryRateEntryDto,
  CreateStatutoryRateScheduleDto,
  QueryStatutoryRateSchedulesDto,
  UpdateStatutoryRateScheduleDto,
} from './dto/statutory-rate.dto';
import { StatutoryRateEntryEntity } from './entities/statutory-rate-entry.entity';
import { StatutoryRateScheduleEntity } from './entities/statutory-rate-schedule.entity';
import { StatutoryScheduleStatus } from './enums/payroll.enum';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export type StatutoryRateScheduleWithEntries = StatutoryRateScheduleEntity & {
  entries: StatutoryRateEntryEntity[];
};

@Injectable()
export class StatutoryRateService {
  constructor(
    @InjectRepository(StatutoryRateScheduleEntity)
    private readonly scheduleRepository: Repository<StatutoryRateScheduleEntity>,
    @InjectRepository(StatutoryRateEntryEntity)
    private readonly entryRepository: Repository<StatutoryRateEntryEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createSchedule(
    dto: CreateStatutoryRateScheduleDto,
    actor: ActorContext,
  ): Promise<StatutoryRateScheduleWithEntries> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    const saved = await this.scheduleRepository.save(
      this.scheduleRepository.create({
        tenantId,
        legalEntityId: dto.legalEntityId,
        countryCode: dto.countryCode,
        name: dto.name,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo ?? null,
        status: StatutoryScheduleStatus.DRAFT,
      }),
    );

    const entries = dto.entries?.length
      ? await this.saveEntries(tenantId, saved.id, dto.entries)
      : [];

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.statutory_rate_schedule.create',
      entityType: 'statutory_rate_schedule',
      entityId: saved.id,
      changes: {
        legalEntityId: { old: null, new: saved.legalEntityId },
        countryCode: { old: null, new: saved.countryCode },
        name: { old: null, new: saved.name },
        effectiveFrom: { old: null, new: saved.effectiveFrom },
        status: { old: null, new: saved.status },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { ...saved, entries };
  }

  private async saveEntries(
    tenantId: string,
    scheduleId: string,
    entries: CreateStatutoryRateEntryDto[],
  ): Promise<StatutoryRateEntryEntity[]> {
    return this.entryRepository.save(
      entries.map((entry) =>
        this.entryRepository.create({
          tenantId,
          scheduleId,
          rateKey: entry.rateKey,
          rateValue: entry.rateValue.toString(),
          rateUnit: entry.rateUnit,
        }),
      ),
    );
  }

  async addEntry(
    scheduleId: string,
    dto: CreateStatutoryRateEntryDto,
    actor: ActorContext,
  ): Promise<StatutoryRateEntryEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const schedule = await this.getSchedule(scheduleId, tenantId);

    const saved = await this.entryRepository.save(
      this.entryRepository.create({
        tenantId,
        scheduleId: schedule.id,
        rateKey: dto.rateKey,
        rateValue: dto.rateValue.toString(),
        rateUnit: dto.rateUnit,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.statutory_rate_entry.create',
      entityType: 'statutory_rate_entry',
      entityId: saved.id,
      changes: {
        scheduleId: { old: null, new: saved.scheduleId },
        rateKey: { old: null, new: saved.rateKey },
        rateValue: { old: null, new: saved.rateValue },
        rateUnit: { old: null, new: saved.rateUnit },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async listSchedules(
    query: QueryStatutoryRateSchedulesDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<StatutoryRateScheduleEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.tenantId = :tenantId', { tenantId })
      .orderBy('schedule.effectiveFrom', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.legalEntityId) {
      qb.andWhere('schedule.legalEntityId = :legalEntityId', {
        legalEntityId: query.legalEntityId,
      });
    }

    if (query.countryCode) {
      qb.andWhere('schedule.countryCode = :countryCode', {
        countryCode: query.countryCode,
      });
    }

    if (query.status) {
      qb.andWhere('schedule.status = :status', { status: query.status });
    }

    const [items, totalItems] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  async getSchedule(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<StatutoryRateScheduleEntity> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, tenantId },
    });
    if (!schedule) {
      throw new NotFoundException({
        code: 'STATUTORY_RATE_SCHEDULE_NOT_FOUND',
        message: 'Statutory rate schedule not found',
      });
    }
    return schedule;
  }

  async getScheduleWithEntries(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<StatutoryRateScheduleWithEntries> {
    const schedule = await this.getSchedule(id, tenantId);
    const entries = await this.entryRepository.find({
      where: { scheduleId: schedule.id, tenantId },
    });
    return { ...schedule, entries };
  }

  async updateSchedule(
    id: string,
    dto: UpdateStatutoryRateScheduleDto,
    actor: ActorContext,
  ): Promise<StatutoryRateScheduleEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const schedule = await this.getSchedule(id, tenantId);

    const changes: AuditLogChanges = {};
    const updatableKeys: Array<keyof UpdateStatutoryRateScheduleDto> = [
      'name',
      'effectiveFrom',
      'effectiveTo',
    ];

    for (const key of updatableKeys) {
      const nextValue = dto[key];
      if (nextValue === undefined) {
        continue;
      }
      const currentValue = schedule[key];
      if (currentValue !== nextValue) {
        changes[key] = { old: currentValue, new: nextValue };
        (schedule as unknown as Record<string, unknown>)[key] = nextValue;
      }
    }

    const saved = await this.scheduleRepository.save(schedule);

    if (Object.keys(changes).length > 0) {
      await this.auditLogService.append({
        tenantId,
        actorId: actor.userId,
        action: 'payroll.statutory_rate_schedule.update',
        entityType: 'statutory_rate_schedule',
        entityId: saved.id,
        changes,
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
    }

    return saved;
  }

  async activateSchedule(
    id: string,
    actor: ActorContext,
  ): Promise<StatutoryRateScheduleEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const schedule = await this.getSchedule(id, tenantId);
    const previousStatus = schedule.status;

    const priorActiveSchedules = await this.scheduleRepository.find({
      where: {
        tenantId,
        legalEntityId: schedule.legalEntityId,
        countryCode: schedule.countryCode,
        status: StatutoryScheduleStatus.ACTIVE,
      },
    });

    schedule.status = StatutoryScheduleStatus.ACTIVE;

    const toSave: StatutoryRateScheduleEntity[] = [
      ...priorActiveSchedules
        .filter((prior) => prior.id !== schedule.id)
        .map((prior) => ({
          ...prior,
          status: StatutoryScheduleStatus.SUPERSEDED,
        })),
      schedule,
    ];

    const saved = await this.scheduleRepository.save(toSave);
    const activated = saved.find((item) => item.id === schedule.id) as
      | StatutoryRateScheduleEntity
      | undefined;

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.statutory_rate_schedule.activate',
      entityType: 'statutory_rate_schedule',
      entityId: schedule.id,
      changes: {
        status: { old: previousStatus, new: StatutoryScheduleStatus.ACTIVE },
        supersededScheduleIds: {
          old: null,
          new: priorActiveSchedules
            .filter((prior) => prior.id !== schedule.id)
            .map((prior) => prior.id),
        },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return activated ?? schedule;
  }

  async resolveRates(
    legalEntityId: string,
    countryCode: string,
    asOfDate: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<StatutoryRateEntryEntity[]> {
    const baseWhere = {
      tenantId,
      legalEntityId,
      countryCode,
      status: StatutoryScheduleStatus.ACTIVE,
      effectiveFrom: LessThanOrEqual(asOfDate),
    };

    const schedule = await this.scheduleRepository.findOne({
      where: [
        { ...baseWhere, effectiveTo: IsNull() },
        { ...baseWhere, effectiveTo: MoreThanOrEqual(asOfDate) },
      ],
    });

    if (!schedule) {
      return [];
    }

    return this.entryRepository.find({
      where: { tenantId, scheduleId: schedule.id },
    });
  }

  async getImpactPreview(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{ workerCount: number }> {
    const schedule = await this.getSchedule(id, tenantId);
    const workerCount = await this.workerRepository.count({
      where: { tenantId, legalEntityId: schedule.legalEntityId },
    });
    return { workerCount };
  }
}
