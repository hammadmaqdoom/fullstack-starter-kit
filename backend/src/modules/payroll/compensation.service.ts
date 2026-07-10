import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogChanges } from '@/modules/compliance/entities/audit-log.entity';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateCompensationDto,
  QueryCompensationDto,
  UpdateCompensationDto,
} from './dto/compensation.dto';
import { CompensationRecordEntity } from './entities/compensation-record.entity';
import { PayComponentEntity } from './entities/pay-component.entity';
import { isPayrollAdmin } from './payroll-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export type CompensationRecordResponse = Omit<
  CompensationRecordEntity,
  'tenant' | 'worker' | 'payComponent'
> & {
  amount: string | null;
};

function toCompensationResponse(
  record: CompensationRecordEntity,
  auth: PolarisAuthContext,
): CompensationRecordResponse {
  const { tenant, worker, payComponent, ...rest } = record;
  return {
    ...rest,
    amount: isPayrollAdmin(auth) ? record.amount : null,
  };
}

@Injectable()
export class CompensationService {
  constructor(
    @InjectRepository(CompensationRecordEntity)
    private readonly compensationRepository: Repository<CompensationRecordEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(PayComponentEntity)
    private readonly payComponentRepository: Repository<PayComponentEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async createCompensation(
    dto: CreateCompensationDto,
    actor: ActorContext,
  ): Promise<CompensationRecordEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    const worker = await this.workerRepository.findOne({
      where: { id: dto.workerId, tenantId },
      select: ['id'],
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    const payComponent = await this.payComponentRepository.findOne({
      where: { id: dto.payComponentId, tenantId },
      select: ['id'],
    });
    if (!payComponent) {
      throw new NotFoundException({
        code: 'PAY_COMPONENT_NOT_FOUND',
        message: 'Pay component not found',
      });
    }

    const saved = await this.compensationRepository.save(
      this.compensationRepository.create({
        tenantId,
        workerId: dto.workerId,
        payComponentId: dto.payComponentId,
        amount: dto.amount.toString(),
        currencyCode: dto.currencyCode,
        payFrequency: dto.payFrequency,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo ?? null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.compensation_record.create',
      entityType: 'compensation_record',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        payComponentId: { old: null, new: saved.payComponentId },
        amount: { old: null, new: saved.amount },
        currencyCode: { old: null, new: saved.currencyCode },
        effectiveFrom: { old: null, new: saved.effectiveFrom },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async updateCompensation(
    id: string,
    dto: UpdateCompensationDto,
    actor: ActorContext,
  ): Promise<CompensationRecordEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const record = await this.compensationRepository.findOne({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'COMPENSATION_RECORD_NOT_FOUND',
        message: 'Compensation record not found',
      });
    }

    const changes: AuditLogChanges = {};
    const nextAmount =
      dto.amount === undefined ? undefined : dto.amount.toString();

    const updatableEntries: Array<[keyof CompensationRecordEntity, unknown]> =
      [
        ['amount', nextAmount],
        ['currencyCode', dto.currencyCode],
        ['payFrequency', dto.payFrequency],
        ['effectiveFrom', dto.effectiveFrom],
        ['effectiveTo', dto.effectiveTo],
      ];

    for (const [key, nextValue] of updatableEntries) {
      if (nextValue === undefined) {
        continue;
      }
      const currentValue = record[key];
      if (currentValue !== nextValue) {
        changes[key] = { old: currentValue, new: nextValue };
        (record as unknown as Record<string, unknown>)[key] = nextValue;
      }
    }

    const saved = await this.compensationRepository.save(record);

    if (Object.keys(changes).length > 0) {
      await this.auditLogService.append({
        tenantId,
        actorId: actor.userId,
        action: 'payroll.compensation_record.update',
        entityType: 'compensation_record',
        entityId: saved.id,
        changes,
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
    }

    return saved;
  }

  async listCompensationRecords(
    query: QueryCompensationDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<CompensationRecordResponse>> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.compensationRepository
      .createQueryBuilder('compensation')
      .where('compensation.tenantId = :tenantId', { tenantId })
      .orderBy('compensation.effectiveFrom', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.workerId) {
      qb.andWhere('compensation.workerId = :workerId', {
        workerId: query.workerId,
      });
    } else if (!isPayrollAdmin(auth)) {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        actorUserId,
        tenantId,
      );
      if (!actingWorkerId) {
        return {
          items: [],
          meta: { page, limit, totalItems: 0, totalPages: 0 },
        };
      }
      qb.andWhere('compensation.workerId = :workerId', {
        workerId: actingWorkerId,
      });
    }

    const [items, totalItems] = await qb.getManyAndCount();
    return {
      items: items.map((item) => toCompensationResponse(item, auth)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  async getCompensationRecord(
    id: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<CompensationRecordResponse> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const record = await this.compensationRepository.findOne({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'COMPENSATION_RECORD_NOT_FOUND',
        message: 'Compensation record not found',
      });
    }
    return toCompensationResponse(record, auth);
  }
}
