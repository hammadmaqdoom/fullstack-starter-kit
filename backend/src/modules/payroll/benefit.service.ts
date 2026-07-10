import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogChanges } from '@/modules/compliance/entities/audit-log.entity';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BenefitTypeEntity } from '@/modules/country-config/entities/benefit-type.entity';
import {
  BenefitDeliveryMode,
  BenefitTypeStatus,
} from '@/modules/country-config/enums/setup-wizard.enum';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateBenefitTypeDto,
  QueryBenefitTypesDto,
  UpdateBenefitTypeDto,
} from './dto/benefit-type.dto';
import {
  CreateEmployeeBenefitDto,
  QueryEmployeeBenefitsDto,
  UpdateEmployeeBenefitDto,
} from './dto/employee-benefit.dto';
import { BenefitTypeFieldEntity } from './entities/benefit-type-field.entity';
import { EmployeeBenefitEntity } from './entities/employee-benefit.entity';
import {
  BenefitTypeFieldType,
  EmployeeBenefitStatus,
} from './enums/payroll.enum';
import { isPayrollAdmin } from './payroll-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export type BenefitTypeWithFields = BenefitTypeEntity & {
  fields: BenefitTypeFieldEntity[];
};

@Injectable()
export class BenefitService {
  constructor(
    @InjectRepository(BenefitTypeEntity)
    private readonly benefitTypeRepository: Repository<BenefitTypeEntity>,
    @InjectRepository(BenefitTypeFieldEntity)
    private readonly benefitTypeFieldRepository: Repository<BenefitTypeFieldEntity>,
    @InjectRepository(EmployeeBenefitEntity)
    private readonly employeeBenefitRepository: Repository<EmployeeBenefitEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async createBenefitType(
    dto: CreateBenefitTypeDto,
    actor: ActorContext,
  ): Promise<BenefitTypeWithFields> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    const existing = await this.benefitTypeRepository.findOne({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException({
        code: 'BENEFIT_TYPE_CODE_EXISTS',
        message: `Benefit type code ${dto.code} already exists`,
      });
    }

    const saved = await this.benefitTypeRepository.save(
      this.benefitTypeRepository.create({
        tenantId,
        code: dto.code,
        name: dto.name,
        category: dto.category,
        countryCode: dto.countryCode ?? null,
        deliveryMode: dto.deliveryMode ?? BenefitDeliveryMode.NON_CASH,
        affectsPayroll: dto.affectsPayroll ?? false,
        affectsTax: dto.affectsTax ?? false,
        status: dto.status ?? BenefitTypeStatus.DRAFT,
        payrollTreatment: dto.payrollTreatment ?? null,
        payComponentId: dto.payComponentId ?? null,
        employeeVisible: dto.employeeVisible ?? false,
      }),
    );

    const fields = dto.fields?.length
      ? await this.benefitTypeFieldRepository.save(
          dto.fields.map((field) =>
            this.benefitTypeFieldRepository.create({
              tenantId,
              benefitTypeId: saved.id,
              fieldCode: field.fieldCode,
              label: field.label,
              fieldType: field.fieldType ?? BenefitTypeFieldType.TEXT,
              required: field.required ?? false,
              employeeVisible: field.employeeVisible ?? false,
              displayOrder: field.displayOrder ?? 0,
              validationRules: field.validationRules ?? null,
            }),
          ),
        )
      : [];

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.benefit_type.create',
      entityType: 'benefit_type',
      entityId: saved.id,
      changes: {
        code: { old: null, new: saved.code },
        name: { old: null, new: saved.name },
        status: { old: null, new: saved.status },
        countryCode: { old: null, new: saved.countryCode },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { ...saved, fields };
  }

  async listBenefitTypes(
    query: QueryBenefitTypesDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<BenefitTypeEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.benefitTypeRepository
      .createQueryBuilder('benefitType')
      .where('benefitType.tenantId = :tenantId', { tenantId })
      .orderBy('benefitType.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.countryCode) {
      qb.andWhere(
        '(benefitType.countryCode = :countryCode OR benefitType.countryCode IS NULL)',
        { countryCode: query.countryCode },
      );
    }

    if (query.status) {
      qb.andWhere('benefitType.status = :status', { status: query.status });
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

  async getBenefitType(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<BenefitTypeEntity> {
    const benefitType = await this.benefitTypeRepository.findOne({
      where: { id, tenantId },
    });
    if (!benefitType) {
      throw new NotFoundException({
        code: 'BENEFIT_TYPE_NOT_FOUND',
        message: 'Benefit type not found',
      });
    }
    return benefitType;
  }

  async updateBenefitType(
    id: string,
    dto: UpdateBenefitTypeDto,
    actor: ActorContext,
  ): Promise<BenefitTypeEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const benefitType = await this.getBenefitType(id, tenantId);

    const changes: AuditLogChanges = {};
    const updatableKeys: Array<keyof UpdateBenefitTypeDto> = [
      'name',
      'category',
      'countryCode',
      'deliveryMode',
      'affectsPayroll',
      'affectsTax',
      'status',
      'payrollTreatment',
      'payComponentId',
      'employeeVisible',
    ];

    for (const key of updatableKeys) {
      const nextValue = dto[key];
      if (nextValue === undefined) {
        continue;
      }
      const currentValue = benefitType[key];
      if (currentValue !== nextValue) {
        changes[key] = { old: currentValue, new: nextValue };
        (benefitType as unknown as Record<string, unknown>)[key] = nextValue;
      }
    }

    const saved = await this.benefitTypeRepository.save(benefitType);

    if (Object.keys(changes).length > 0) {
      await this.auditLogService.append({
        tenantId,
        actorId: actor.userId,
        action: 'payroll.benefit_type.update',
        entityType: 'benefit_type',
        entityId: saved.id,
        changes,
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
    }

    return saved;
  }

  async assignEmployeeBenefit(
    dto: CreateEmployeeBenefitDto,
    actor: ActorContext,
  ): Promise<EmployeeBenefitEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    const worker = await this.workerRepository.findOne({
      where: { id: dto.workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    const benefitType = await this.benefitTypeRepository.findOne({
      where: { id: dto.benefitTypeId, tenantId },
    });
    if (!benefitType) {
      throw new NotFoundException({
        code: 'BENEFIT_TYPE_NOT_FOUND',
        message: 'Benefit type not found',
      });
    }

    if (
      benefitType.countryCode &&
      benefitType.countryCode !== worker.countryCode
    ) {
      throw new BadRequestException({
        code: 'BENEFIT_TYPE_COUNTRY_MISMATCH',
        message: 'Benefit type is not available for worker country',
      });
    }

    if (benefitType.status === BenefitTypeStatus.ARCHIVED) {
      throw new BadRequestException({
        code: 'BENEFIT_TYPE_ARCHIVED',
        message: 'Cannot assign an archived benefit type',
      });
    }

    const saved = await this.employeeBenefitRepository.save(
      this.employeeBenefitRepository.create({
        tenantId,
        workerId: worker.id,
        benefitTypeId: benefitType.id,
        fieldValues: dto.fieldValues ?? {},
        effectiveFrom:
          dto.effectiveFrom ?? new Date().toISOString().slice(0, 10),
        effectiveTo: dto.effectiveTo ?? null,
        status: dto.status ?? EmployeeBenefitStatus.ACTIVE,
        currencyCode: dto.currencyCode ?? null,
        notes: dto.notes ?? null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.employee_benefit.assign',
      entityType: 'employee_benefit',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        benefitTypeId: { old: null, new: saved.benefitTypeId },
        status: { old: null, new: saved.status },
        effectiveFrom: { old: null, new: saved.effectiveFrom },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async listEmployeeBenefits(
    query: QueryEmployeeBenefitsDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<EmployeeBenefitEntity>> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.employeeBenefitRepository
      .createQueryBuilder('employeeBenefit')
      .leftJoinAndSelect('employeeBenefit.benefitType', 'benefitType')
      .where('employeeBenefit.tenantId = :tenantId', { tenantId })
      .orderBy('employeeBenefit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.workerId) {
      qb.andWhere('employeeBenefit.workerId = :workerId', {
        workerId: query.workerId,
      });
    } else if (!isPayrollAdmin(auth)) {
      const actingWorker = await this.workerRepository.findOne({
        where: { tenantId, userId: actorUserId },
        select: ['id'],
      });
      if (!actingWorker) {
        return {
          items: [],
          meta: { page, limit, totalItems: 0, totalPages: 0 },
        };
      }
      qb.andWhere('employeeBenefit.workerId = :workerId', {
        workerId: actingWorker.id,
      });
    }

    if (query.status) {
      qb.andWhere('employeeBenefit.status = :status', { status: query.status });
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

  async updateEmployeeBenefit(
    id: string,
    dto: UpdateEmployeeBenefitDto,
    actor: ActorContext,
  ): Promise<EmployeeBenefitEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const employeeBenefit = await this.employeeBenefitRepository.findOne({
      where: { id, tenantId },
    });
    if (!employeeBenefit) {
      throw new NotFoundException({
        code: 'EMPLOYEE_BENEFIT_NOT_FOUND',
        message: 'Employee benefit assignment not found',
      });
    }

    const changes: AuditLogChanges = {};
    const updatableKeys: Array<keyof UpdateEmployeeBenefitDto> = [
      'fieldValues',
      'effectiveTo',
      'status',
      'currencyCode',
      'notes',
    ];

    for (const key of updatableKeys) {
      const nextValue = dto[key];
      if (nextValue === undefined) {
        continue;
      }
      const currentValue = employeeBenefit[key];
      if (JSON.stringify(currentValue) !== JSON.stringify(nextValue)) {
        changes[key] = { old: currentValue, new: nextValue };
        (employeeBenefit as unknown as Record<string, unknown>)[key] =
          nextValue;
      }
    }

    const saved = await this.employeeBenefitRepository.save(employeeBenefit);

    if (Object.keys(changes).length > 0) {
      await this.auditLogService.append({
        tenantId,
        actorId: actor.userId,
        action: 'payroll.employee_benefit.update',
        entityType: 'employee_benefit',
        entityId: saved.id,
        changes,
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
    }

    return saved;
  }
}
