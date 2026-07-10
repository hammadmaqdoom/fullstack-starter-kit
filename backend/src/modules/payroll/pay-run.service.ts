import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import { BenefitPayrollTreatment } from '@/modules/country-config/enums/setup-wizard.enum';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePayRunDto, QueryPayRunsDto } from './dto/pay-run.dto';
import { CompensationRecordEntity } from './entities/compensation-record.entity';
import { EmployeeBenefitEntity } from './entities/employee-benefit.entity';
import { PayRunLineItemEntity } from './entities/pay-run-line-item.entity';
import { PayRunEntity } from './entities/pay-run.entity';
import {
  EmployeeBenefitStatus,
  PayComponentType,
  PayRunStatus,
} from './enums/payroll.enum';
import {
  PayRunCalculatorService,
  WorkerPayCashBenefit,
  WorkerPayInput,
} from './pay-run-calculator.service';
import {
  PAY_RUN_LOP_PROVIDER,
  PayRunLopProvider,
} from './pay-run-lop-provider';
import { isPayrollAdmin } from './payroll-scope.util';
import { StatutoryRateService } from './statutory-rate.service';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export type PayRunWithLineItems = PayRunEntity & {
  lineItems: PayRunLineItemEntity[];
};

@Injectable()
export class PayRunService {
  constructor(
    @InjectRepository(PayRunEntity)
    private readonly payRunRepository: Repository<PayRunEntity>,
    @InjectRepository(PayRunLineItemEntity)
    private readonly lineItemRepository: Repository<PayRunLineItemEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(CompensationRecordEntity)
    private readonly compensationRepository: Repository<CompensationRecordEntity>,
    @InjectRepository(EmployeeBenefitEntity)
    private readonly employeeBenefitRepository: Repository<EmployeeBenefitEntity>,
    private readonly calculator: PayRunCalculatorService,
    private readonly statutoryRateService: StatutoryRateService,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    @Inject(PAY_RUN_LOP_PROVIDER)
    private readonly lopProvider: PayRunLopProvider,
  ) {}

  async createPayRun(
    dto: CreatePayRunDto,
    actor: ActorContext,
  ): Promise<PayRunEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    const saved = await this.payRunRepository.save(
      this.payRunRepository.create({
        tenantId,
        legalEntityId: dto.legalEntityId,
        countryCode: dto.countryCode,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        functionalCurrency: dto.functionalCurrency,
        status: PayRunStatus.DRAFT,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.pay_run.create',
      entityType: 'pay_run',
      entityId: saved.id,
      changes: {
        legalEntityId: { old: null, new: saved.legalEntityId },
        countryCode: { old: null, new: saved.countryCode },
        periodStart: { old: null, new: saved.periodStart },
        periodEnd: { old: null, new: saved.periodEnd },
        status: { old: null, new: saved.status },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async listPayRuns(
    query: QueryPayRunsDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<PayRunEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.payRunRepository
      .createQueryBuilder('payRun')
      .where('payRun.tenantId = :tenantId', { tenantId })
      .orderBy('payRun.periodStart', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.legalEntityId) {
      qb.andWhere('payRun.legalEntityId = :legalEntityId', {
        legalEntityId: query.legalEntityId,
      });
    }

    if (query.status) {
      qb.andWhere('payRun.status = :status', { status: query.status });
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

  async getPayRunDetail(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PayRunWithLineItems> {
    const payRun = await this.getPayRunEntity(id, tenantId);
    const lineItems = await this.lineItemRepository.find({
      where: { payRunId: payRun.id, tenantId },
    });
    return { ...payRun, lineItems };
  }

  async calculatePayRun(
    id: string,
    actor: ActorContext,
  ): Promise<PayRunWithLineItems> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const payRun = await this.getPayRunEntity(id, tenantId);

    if (
      payRun.status !== PayRunStatus.DRAFT &&
      payRun.status !== PayRunStatus.REVIEW
    ) {
      throw new BadRequestException({
        code: 'PAY_RUN_INVALID_STATUS_FOR_CALCULATE',
        message: 'Pay run can only be calculated from draft or review status',
      });
    }

    const workers = await this.loadEligibleWorkers(payRun, tenantId);
    const statutoryRates = await this.statutoryRateService.resolveRates(
      payRun.legalEntityId,
      payRun.countryCode,
      payRun.periodEnd,
      tenantId,
    );
    const workingDaysInPeriod = countWeekdays(
      payRun.periodStart,
      payRun.periodEnd,
    );

    const lineItemDrafts: Array<Partial<PayRunLineItemEntity>> = [];
    for (const worker of workers) {
      const input = await this.buildWorkerPayInput(
        worker,
        payRun,
        statutoryRates,
        workingDaysInPeriod,
        tenantId,
      );
      const result = this.calculator.calculate(input);

      lineItemDrafts.push({
        tenantId,
        legalEntityId: payRun.legalEntityId,
        payRunId: payRun.id,
        workerId: worker.id,
        grossPay: result.grossPay.toString(),
        totalDeductions: result.totalDeductions.toString(),
        netPay: result.netPay.toString(),
        currencyCode: result.currencyCode,
        calculationSnapshot: result.calculationSnapshot,
        anomalyFlags: result.anomalyFlags,
      });
    }

    await this.lineItemRepository.delete({ payRunId: payRun.id, tenantId });
    const savedLineItems = lineItemDrafts.length
      ? await this.lineItemRepository.save(
          lineItemDrafts.map((draft) => this.lineItemRepository.create(draft)),
        )
      : [];

    const previousStatus = payRun.status;
    payRun.status = PayRunStatus.REVIEW;
    const savedPayRun = await this.payRunRepository.save(payRun);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.pay_run.calculate',
      entityType: 'pay_run',
      entityId: savedPayRun.id,
      changes: {
        status: { old: previousStatus, new: savedPayRun.status },
        lineItemCount: { old: null, new: savedLineItems.length },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { ...savedPayRun, lineItems: savedLineItems };
  }

  async approvePayRun(id: string, actor: ActorContext): Promise<PayRunEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const auth = await this.rbacService.getAuthContext(actor.userId, tenantId);

    if (!isPayrollAdmin(auth)) {
      throw new ForbiddenException({
        code: 'PAY_RUN_APPROVE_FORBIDDEN',
        message: 'Only payroll admins can approve a pay run',
      });
    }

    const payRun = await this.getPayRunEntity(id, tenantId);

    if (payRun.status === PayRunStatus.APPROVED) {
      return payRun;
    }

    if (payRun.status !== PayRunStatus.REVIEW) {
      throw new BadRequestException({
        code: 'PAY_RUN_INVALID_STATUS_FOR_APPROVE',
        message: 'Pay run can only be approved from review status',
      });
    }

    const previousStatus = payRun.status;
    payRun.status = PayRunStatus.APPROVED;
    payRun.approvedBy = actor.userId;
    payRun.approvedAt = new Date();

    const saved = await this.payRunRepository.save(payRun);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.pay_run.approve',
      entityType: 'pay_run',
      entityId: saved.id,
      changes: {
        status: { old: previousStatus, new: saved.status },
        approvedBy: { old: null, new: saved.approvedBy },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  private async getPayRunEntity(
    id: string,
    tenantId: string,
  ): Promise<PayRunEntity> {
    const payRun = await this.payRunRepository.findOne({
      where: { id, tenantId },
    });
    if (!payRun) {
      throw new NotFoundException({
        code: 'PAY_RUN_NOT_FOUND',
        message: 'Pay run not found',
      });
    }
    return payRun;
  }

  private async loadEligibleWorkers(
    payRun: PayRunEntity,
    tenantId: string,
  ): Promise<WorkerEntity[]> {
    return this.workerRepository
      .createQueryBuilder('worker')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.status = :status', { status: WorkerStatus.ACTIVE })
      .andWhere(
        '(worker.legalEntityId = :legalEntityId OR (worker.legalEntityId IS NULL AND worker.countryCode = :countryCode))',
        {
          legalEntityId: payRun.legalEntityId,
          countryCode: payRun.countryCode,
        },
      )
      .getMany();
  }

  private async buildWorkerPayInput(
    worker: WorkerEntity,
    payRun: PayRunEntity,
    statutoryRates: Array<{
      rateKey: string;
      rateValue: string;
      rateUnit: string;
    }>,
    workingDaysInPeriod: number,
    tenantId: string,
  ): Promise<WorkerPayInput> {
    const [baseSalary, cashBenefits, lopDays] = await Promise.all([
      this.resolveBaseSalary(worker.id, payRun.periodEnd, tenantId),
      this.resolveCashBenefits(worker.id, payRun.periodEnd, tenantId),
      this.lopProvider.resolveLopDays(
        worker.id,
        payRun.periodStart,
        payRun.periodEnd,
      ),
    ]);

    return {
      workerId: worker.id,
      baseSalary,
      currencyCode: payRun.functionalCurrency,
      cashBenefits,
      lopDays,
      workingDaysInPeriod,
      daysEmployedInPeriod: this.resolveDaysEmployed(
        worker,
        payRun.periodStart,
        payRun.periodEnd,
      ),
      statutoryRates: statutoryRates.map((rate) => ({
        rateKey: rate.rateKey,
        rateValue: Number(rate.rateValue),
        rateUnit: rate.rateUnit as 'percentage' | 'fixed_amount',
      })),
      hasBankDetails: Boolean(worker.bankCountryCode),
    };
  }

  private async resolveBaseSalary(
    workerId: string,
    periodEnd: string,
    tenantId: string,
  ): Promise<number> {
    const records = await this.compensationRepository
      .createQueryBuilder('compensation')
      .innerJoin('compensation.payComponent', 'payComponent')
      .where('compensation.tenantId = :tenantId', { tenantId })
      .andWhere('compensation.workerId = :workerId', { workerId })
      .andWhere('payComponent.componentType = :componentType', {
        componentType: PayComponentType.EARNING,
      })
      .andWhere('compensation.effectiveFrom <= :periodEnd', { periodEnd })
      .andWhere(
        '(compensation.effectiveTo IS NULL OR compensation.effectiveTo >= :periodEnd)',
        { periodEnd },
      )
      .getMany();

    return round2(
      records.reduce((sum, record) => sum + Number(record.amount), 0),
    );
  }

  private async resolveCashBenefits(
    workerId: string,
    periodEnd: string,
    tenantId: string,
  ): Promise<WorkerPayCashBenefit[]> {
    const benefits = await this.employeeBenefitRepository
      .createQueryBuilder('benefit')
      .innerJoinAndSelect('benefit.benefitType', 'benefitType')
      .where('benefit.tenantId = :tenantId', { tenantId })
      .andWhere('benefit.workerId = :workerId', { workerId })
      .andWhere('benefit.status = :status', {
        status: EmployeeBenefitStatus.ACTIVE,
      })
      .andWhere('benefitType.affectsPayroll = true')
      .andWhere('benefit.effectiveFrom <= :periodEnd', { periodEnd })
      .andWhere(
        '(benefit.effectiveTo IS NULL OR benefit.effectiveTo >= :periodEnd)',
        { periodEnd },
      )
      .getMany();

    return benefits.reduce<WorkerPayCashBenefit[]>((cashBenefits, benefit) => {
      const amount = Number(benefit.fieldValues?.amount ?? 0);
      if (!amount) {
        return cashBenefits;
      }
      cashBenefits.push({
        code: benefit.benefitType?.code ?? benefit.benefitTypeId,
        amount,
        includeInGross:
          benefit.benefitType?.payrollTreatment ===
          BenefitPayrollTreatment.INCLUDE_IN_GROSS,
      });
      return cashBenefits;
    }, []);
  }

  private resolveDaysEmployed(
    worker: WorkerEntity,
    periodStart: string,
    periodEnd: string,
  ): number {
    const effectiveStart =
      worker.startDate > periodStart ? worker.startDate : periodStart;
    const effectiveEnd =
      worker.endDate && worker.endDate < periodEnd ? worker.endDate : periodEnd;

    if (effectiveStart > effectiveEnd) {
      return 0;
    }
    return countWeekdays(effectiveStart, effectiveEnd);
  }
}

function countWeekdays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (start > end) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
