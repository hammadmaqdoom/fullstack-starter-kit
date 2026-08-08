import { DIGITARO_TENANT_ID, SYSTEM_ACTOR_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { AuditLogEntity } from '@/modules/compliance/entities/audit-log.entity';
import { LeaveAccrualMethod } from '@/modules/country-config/enums/setup-wizard.enum';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { EmploymentTypeCountryConfigEntity } from '@/modules/country-config/entities/employment-type-country-config.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LeaveBalanceEntity } from './entities/leave-balance.entity';
import {
  ACCRUAL_CARRY_FORWARD_ACTION,
  ACCRUAL_CREDIT_ACTION,
  buildAccrualPeriodKey,
  buildCarryForwardPeriodKey,
  computeCarryForwardDays,
  computeMonthlyCredit,
  computeProRatedAnnualEntitlement,
  resolveDaysPerYear,
  roundAccrualDays,
} from './leave-accrual.calculator';
import { decimalToNumber, toDecimalString } from './time-leave-scope.util';

export type LeaveAccrualRunResult = {
  processed: number;
  credited: number;
  skipped: number;
  year: number;
  month: number;
};

@Injectable()
export class LeaveAccrualService {
  private readonly logger = new Logger(LeaveAccrualService.name);

  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(LeaveTypeEntity)
    private readonly leaveTypeRepository: Repository<LeaveTypeEntity>,
    @InjectRepository(LeaveBalanceEntity)
    private readonly leaveBalanceRepository: Repository<LeaveBalanceEntity>,
    @InjectRepository(EmploymentTypeCountryConfigEntity)
    private readonly matrixRepository: Repository<EmploymentTypeCountryConfigEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async runMonthlyAccrual(
    asOf: Date = new Date(),
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LeaveAccrualRunResult> {
    const year = asOf.getUTCFullYear();
    const month = asOf.getUTCMonth() + 1;
    const correlationId = crypto.randomUUID();

    const workers = await this.workerRepository.find({
      where: {
        tenantId,
        status: In([WorkerStatus.ACTIVE, WorkerStatus.ON_LEAVE]),
      },
    });

    const leaveTypes = await this.leaveTypeRepository.find({
      where: { tenantId },
    });
    const leaveTypesByCountry = new Map<string, LeaveTypeEntity[]>();
    for (const leaveType of leaveTypes) {
      const list = leaveTypesByCountry.get(leaveType.countryCode) ?? [];
      list.push(leaveType);
      leaveTypesByCountry.set(leaveType.countryCode, list);
    }

    const matrixRows = await this.matrixRepository.find({
      where: { tenantId },
    });
    const matrixByKey = new Map(
      matrixRows.map((row) => [
        `${row.employmentTypeId}:${row.countryCode}`,
        row,
      ]),
    );

    let credited = 0;
    let skipped = 0;
    let processed = 0;

    for (const worker of workers) {
      const matrix = matrixByKey.get(
        `${worker.employmentTypeId}:${worker.countryCode}`,
      );
      if (!matrix?.leaveEnabled) {
        skipped += 1;
        continue;
      }

      const types = leaveTypesByCountry.get(worker.countryCode) ?? [];
      for (const leaveType of types) {
        processed += 1;
        const daysPerYear = resolveDaysPerYear(
          decimalToNumber(leaveType.daysPerYear),
          leaveType.code,
          matrix.configJson,
        );

        const carryResult = await this.applyCarryForwardIfNeeded({
          tenantId,
          worker,
          leaveType,
          year,
          correlationId,
        });
        if (carryResult === 'credited') {
          credited += 1;
        } else if (carryResult === 'skipped') {
          skipped += 1;
        }

        const creditResult = await this.applyPeriodCredit({
          tenantId,
          worker,
          leaveType,
          daysPerYear,
          year,
          month,
          correlationId,
        });
        if (creditResult === 'credited') {
          credited += 1;
        } else {
          skipped += 1;
        }
      }
    }

    this.logger.log(
      `Leave accrual ${year}-${String(month).padStart(2, '0')}: processed=${processed} credited=${credited} skipped=${skipped}`,
    );

    return { processed, credited, skipped, year, month };
  }

  private async applyPeriodCredit(input: {
    tenantId: string;
    worker: WorkerEntity;
    leaveType: LeaveTypeEntity;
    daysPerYear: number;
    year: number;
    month: number;
    correlationId: string;
  }): Promise<'credited' | 'skipped'> {
    const { tenantId, worker, leaveType, daysPerYear, year, month, correlationId } =
      input;

    if (daysPerYear <= 0) {
      return 'skipped';
    }

    const periodKey = buildAccrualPeriodKey(
      leaveType.accrualMethod,
      year,
      month,
    );

    if (
      await this.hasAccrualAudit({
        tenantId,
        workerId: worker.id,
        leaveTypeId: leaveType.id,
        action: ACCRUAL_CREDIT_ACTION,
        periodKey,
      })
    ) {
      return 'skipped';
    }

    const fteFraction = decimalToNumber(worker.fteFraction);
    let creditDays = 0;

    if (leaveType.accrualMethod === LeaveAccrualMethod.ANNUAL) {
      creditDays = computeProRatedAnnualEntitlement(
        daysPerYear,
        fteFraction,
        worker.startDate,
        year,
      );
    } else {
      creditDays = computeMonthlyCredit(
        daysPerYear,
        fteFraction,
        worker.startDate,
        year,
        month,
      );
    }

    if (creditDays <= 0) {
      return 'skipped';
    }

    const balance = await this.ensureBalance(
      tenantId,
      worker.id,
      leaveType.id,
      year,
    );
    const previousEntitled = decimalToNumber(balance.entitled);
    const nextEntitled = roundAccrualDays(previousEntitled + creditDays);

    balance.entitled = toDecimalString(nextEntitled);
    await this.leaveBalanceRepository.save(balance);

    await this.auditLogService.append({
      tenantId,
      actorId: SYSTEM_ACTOR_ID,
      action: ACCRUAL_CREDIT_ACTION,
      entityType: 'leave_balance',
      entityId: balance.id,
      correlationId,
      changes: {
        periodKey: { old: null, new: periodKey },
        workerId: { old: null, new: worker.id },
        leaveTypeId: { old: null, new: leaveType.id },
        accrualMethod: { old: null, new: leaveType.accrualMethod },
        creditDays: { old: null, new: creditDays },
        entitled: { old: previousEntitled, new: nextEntitled },
      },
    });

    return 'credited';
  }

  private async applyCarryForwardIfNeeded(input: {
    tenantId: string;
    worker: WorkerEntity;
    leaveType: LeaveTypeEntity;
    year: number;
    correlationId: string;
  }): Promise<'credited' | 'skipped' | 'none'> {
    const { tenantId, worker, leaveType, year, correlationId } = input;
    const cap = decimalToNumber(leaveType.carryForwardCap);
    if (cap <= 0 || year < 2) {
      return 'none';
    }

    const periodKey = buildCarryForwardPeriodKey(year);
    if (
      await this.hasAccrualAudit({
        tenantId,
        workerId: worker.id,
        leaveTypeId: leaveType.id,
        action: ACCRUAL_CARRY_FORWARD_ACTION,
        periodKey,
      })
    ) {
      return 'skipped';
    }

    const prior = await this.leaveBalanceRepository.findOne({
      where: {
        tenantId,
        workerId: worker.id,
        leaveTypeId: leaveType.id,
        year: year - 1,
      },
    });
    if (!prior) {
      return 'none';
    }

    const unused =
      decimalToNumber(prior.entitled) -
      decimalToNumber(prior.used) -
      decimalToNumber(prior.pending);
    const carryDays = computeCarryForwardDays(unused, cap);
    if (carryDays <= 0) {
      return 'none';
    }

    const balance = await this.ensureBalance(
      tenantId,
      worker.id,
      leaveType.id,
      year,
    );
    const previousEntitled = decimalToNumber(balance.entitled);
    const nextEntitled = roundAccrualDays(previousEntitled + carryDays);
    balance.entitled = toDecimalString(nextEntitled);
    await this.leaveBalanceRepository.save(balance);

    await this.auditLogService.append({
      tenantId,
      actorId: SYSTEM_ACTOR_ID,
      action: ACCRUAL_CARRY_FORWARD_ACTION,
      entityType: 'leave_balance',
      entityId: balance.id,
      correlationId,
      changes: {
        periodKey: { old: null, new: periodKey },
        workerId: { old: null, new: worker.id },
        leaveTypeId: { old: null, new: leaveType.id },
        creditDays: { old: null, new: carryDays },
        entitled: { old: previousEntitled, new: nextEntitled },
        priorYearUnused: { old: null, new: unused },
      },
    });

    return 'credited';
  }

  private async ensureBalance(
    tenantId: string,
    workerId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<LeaveBalanceEntity> {
    const existing = await this.leaveBalanceRepository.findOne({
      where: { tenantId, workerId, leaveTypeId, year },
    });
    if (existing) {
      return existing;
    }

    const created = this.leaveBalanceRepository.create({
      tenantId,
      workerId,
      leaveTypeId,
      year,
      entitled: '0.00',
      used: '0.00',
      pending: '0.00',
    });
    return this.leaveBalanceRepository.save(created);
  }

  private async hasAccrualAudit(input: {
    tenantId: string;
    workerId: string;
    leaveTypeId: string;
    action: string;
    periodKey: string;
  }): Promise<boolean> {
    const count = await this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId: input.tenantId })
      .andWhere('audit.action = :action', { action: input.action })
      .andWhere('audit.entityType = :entityType', {
        entityType: 'leave_balance',
      })
      .andWhere("audit.changes -> 'periodKey' ->> 'new' = :periodKey", {
        periodKey: input.periodKey,
      })
      .andWhere("audit.changes -> 'workerId' ->> 'new' = :workerId", {
        workerId: input.workerId,
      })
      .andWhere("audit.changes -> 'leaveTypeId' ->> 'new' = :leaveTypeId", {
        leaveTypeId: input.leaveTypeId,
      })
      .getCount();

    return count > 0;
  }
}
