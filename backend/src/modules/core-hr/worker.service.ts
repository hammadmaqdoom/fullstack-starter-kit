import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { CountryConfigService } from '@/modules/country-config/country-config.service';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import { RowScopeService } from '@/shared/scope/row-scope.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CONTRACTOR_TYPE_CODES,
  STATUTORY_FIELDS_BY_COUNTRY,
} from './constants/statutory-fields.constant';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { QueryWorkersDto } from './dto/query-workers.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { ContractorProfileEntity } from './entities/contractor-profile.entity';
import { WorkerStatutoryIdEntity } from './entities/worker-statutory-id.entity';
import { WorkerEntity } from './entities/worker.entity';
import { EntraStatus, WorkerStatus } from './enums/worker.enum';
import { toWorkerResponse, WorkerResponse } from './worker.mapper';
import {
  applyWorkerScopeFilter,
  resolveActingWorkerId,
} from './worker-scope.util';
import {
  statutoryMapFromRows,
  statutoryRowsFromMap,
} from './worker-statutory.util';

@Injectable()
export class WorkerService {
  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(ContractorProfileEntity)
    private readonly contractorProfileRepository: Repository<ContractorProfileEntity>,
    @InjectRepository(WorkerStatutoryIdEntity)
    private readonly workerStatutoryIdRepository: Repository<WorkerStatutoryIdEntity>,
    private readonly countryConfigService: CountryConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly rowScopeService: RowScopeService,
  ) {}

  async create(
    dto: CreateWorkerDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<WorkerResponse> {
    const rules = await this.countryConfigService.resolveEmploymentTypeCountryRules(
      dto.employmentTypeId,
      dto.countryCode,
      tenantId,
    );

    this.validateStatutoryFields(dto.countryCode, dto.statutoryFields);

    const employmentType = rules.employmentType;
    if (!employmentType) {
      throw new NotFoundException({
        code: 'EMPLOYMENT_TYPE_NOT_FOUND',
        message: 'Employment type not found',
      });
    }

    const isContractor = CONTRACTOR_TYPE_CODES.has(employmentType.code);
    if (isContractor && !dto.contractorProfile) {
      throw new BadRequestException({
        code: 'CONTRACTOR_PROFILE_REQUIRED',
        message: 'Contractor profile is required for contractor employment types',
      });
    }

    const entraStatus = isContractor
      ? EntraStatus.NOT_REQUIRED
      : EntraStatus.PENDING;

    const worker = this.workerRepository.create({
      tenantId,
      employmentTypeId: dto.employmentTypeId,
      countryCode: dto.countryCode,
      bankCountryCode: dto.bankCountryCode ?? dto.countryCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      personalEmail: dto.personalEmail?.toLowerCase() ?? null,
      phone: dto.phone ?? null,
      workMode: dto.workMode ?? null,
      status: WorkerStatus.DRAFT,
      employeeNumber: dto.employeeNumber ?? null,
      managerId: dto.managerId ?? null,
      divisionId: dto.divisionId ?? null,
      departmentId: dto.departmentId ?? null,
      legalEntityId: dto.legalEntityId ?? null,
      startDate: dto.startDate,
      dateOfBirth: dto.dateOfBirth ?? null,
      fteFraction: String(dto.fteFraction ?? 1),
      timezone: dto.timezone ?? null,
      compensationBand: dto.compensationBand ?? null,
      entraStatus,
    });

    const saved = await this.workerRepository.save(worker);
    await this.replaceStatutoryFields(
      tenantId,
      saved.id,
      saved.countryCode,
      dto.statutoryFields,
    );

    let contractorProfile: ContractorProfileEntity | null = null;
    if (isContractor && dto.contractorProfile) {
      contractorProfile = await this.contractorProfileRepository.save(
        this.contractorProfileRepository.create({
          tenantId,
          workerId: saved.id,
          billingModel: dto.contractorProfile.billingModel,
          contractStart: dto.contractorProfile.contractStart ?? null,
          contractEnd: dto.contractorProfile.contractEnd ?? null,
          paymentTermsDays: dto.contractorProfile.paymentTermsDays ?? null,
          paymentCurrency: dto.contractorProfile.paymentCurrency ?? null,
          agencyName: dto.contractorProfile.agencyName ?? null,
        }),
      );
    }

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'worker.create',
      entityType: 'worker',
      entityId: saved.id,
      changes: {
        id: { old: null, new: saved.id },
        email: { old: null, new: saved.email },
        employmentTypeId: { old: null, new: saved.employmentTypeId },
        countryCode: { old: null, new: saved.countryCode },
        status: { old: null, new: saved.status },
      },
      correlationId,
      ipAddress,
    });

    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const statutoryFields = await this.loadStatutoryMap(tenantId, saved.id);
    return toWorkerResponse(saved, auth, contractorProfile, statutoryFields);
  }

  async findAll(
    query: QueryWorkersDto,
    actorId: string,
    tenantId: string,
  ): Promise<PaginatedServiceResult<WorkerResponse>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const qb = this.workerRepository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.employmentType', 'employmentType')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.deletedAt IS NULL');

    if (query.status) {
      qb.andWhere('worker.status = :status', { status: query.status });
    }
    if (query.countryCode) {
      qb.andWhere('worker.countryCode = :countryCode', {
        countryCode: query.countryCode,
      });
    }
    if (query.employmentTypeId) {
      qb.andWhere('worker.employmentTypeId = :employmentTypeId', {
        employmentTypeId: query.employmentTypeId,
      });
    }
    if (query.divisionId) {
      qb.andWhere('worker.divisionId = :divisionId', {
        divisionId: query.divisionId,
      });
    }
    if (query.q?.trim()) {
      qb.andWhere(
        '(worker.firstName ILIKE :q OR worker.lastName ILIKE :q OR worker.email ILIKE :q OR worker.employeeNumber ILIKE :q)',
        { q: `%${query.q.trim()}%` },
      );
    }

    applyWorkerScopeFilter(qb, auth, actingWorkerId);
    qb.orderBy('worker.createdAt', 'DESC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const total = await qb.getCount();

    const workers = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const statutoryByWorker = await this.loadStatutoryMapsForWorkers(
      tenantId,
      workers.map((w) => w.id),
    );
    const items = workers.map((worker) =>
      toWorkerResponse(
        worker,
        auth,
        null,
        statutoryByWorker.get(worker.id) ?? {},
      ),
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    actorId: string,
    tenantId: string,
  ): Promise<WorkerResponse> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const worker = await this.getWorkerOrThrow(id, tenantId);
    await this.assertCanAccessWorker(worker, auth, actorId, tenantId);

    const contractorProfile = await this.contractorProfileRepository.findOne({
      where: { tenantId, workerId: worker.id },
    });

    const statutoryFields = await this.loadStatutoryMap(tenantId, worker.id);
    return toWorkerResponse(worker, auth, contractorProfile, statutoryFields);
  }

  /** Resolve the worker profile linked to the current session (Me/Profile screen). */
  async findMe(
    actorId: string,
    tenantId: string,
  ): Promise<WorkerResponse> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const workerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    if (!workerId) {
      throw new NotFoundException({
        code: 'WORKER_PROFILE_NOT_LINKED',
        message: 'No worker profile is linked to this account',
      });
    }

    const worker = await this.getWorkerOrThrow(workerId, tenantId);
    const contractorProfile = await this.contractorProfileRepository.findOne({
      where: { tenantId, workerId: worker.id },
    });

    const statutoryFields = await this.loadStatutoryMap(tenantId, worker.id);
    return toWorkerResponse(worker, auth, contractorProfile, statutoryFields);
  }

  async update(
    id: string,
    dto: UpdateWorkerDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<WorkerResponse> {
    const worker = await this.getWorkerOrThrow(id, tenantId);
    const before = { ...worker };

    if (dto.countryCode && dto.statutoryFields) {
      this.validateStatutoryFields(dto.countryCode, dto.statutoryFields);
    } else if (dto.statutoryFields) {
      this.validateStatutoryFields(worker.countryCode, dto.statutoryFields);
    }

    if (dto.employmentTypeId && dto.countryCode) {
      await this.countryConfigService.resolveEmploymentTypeCountryRules(
        dto.employmentTypeId,
        dto.countryCode,
        tenantId,
      );
    }

    const { contractorProfile: _contractorProfile, ...workerDto } = dto;

    if (workerDto.email !== undefined) {
      worker.email = workerDto.email.toLowerCase();
    }
    if (workerDto.personalEmail !== undefined) {
      worker.personalEmail = workerDto.personalEmail.toLowerCase();
    }
    if (workerDto.fteFraction !== undefined) {
      worker.fteFraction = String(workerDto.fteFraction);
    }
    if (workerDto.firstName !== undefined) {
      worker.firstName = workerDto.firstName;
    }
    if (workerDto.lastName !== undefined) {
      worker.lastName = workerDto.lastName;
    }
    if (workerDto.phone !== undefined) {
      worker.phone = workerDto.phone;
    }
    if (workerDto.workMode !== undefined) {
      worker.workMode = workerDto.workMode;
    }
    if (workerDto.startDate !== undefined) {
      worker.startDate = workerDto.startDate;
    }
    if (workerDto.dateOfBirth !== undefined) {
      worker.dateOfBirth = workerDto.dateOfBirth;
    }
    if (workerDto.employeeNumber !== undefined) {
      worker.employeeNumber = workerDto.employeeNumber;
    }
    if (workerDto.managerId !== undefined) {
      worker.managerId = workerDto.managerId;
    }
    if (workerDto.divisionId !== undefined) {
      worker.divisionId = workerDto.divisionId;
    }
    if (workerDto.departmentId !== undefined) {
      worker.departmentId = workerDto.departmentId;
    }
    if (workerDto.legalEntityId !== undefined) {
      worker.legalEntityId = workerDto.legalEntityId;
    }
    if (workerDto.countryCode !== undefined) {
      worker.countryCode = workerDto.countryCode;
    }
    if (workerDto.bankCountryCode !== undefined) {
      worker.bankCountryCode = workerDto.bankCountryCode;
    }
    if (workerDto.employmentTypeId !== undefined) {
      worker.employmentTypeId = workerDto.employmentTypeId;
    }
    if (workerDto.timezone !== undefined) {
      worker.timezone = workerDto.timezone;
    }
    if (workerDto.compensationBand !== undefined) {
      worker.compensationBand = workerDto.compensationBand;
    }

    const saved = await this.workerRepository.save(worker);

    if (dto.statutoryFields !== undefined) {
      await this.replaceStatutoryFields(
        tenantId,
        saved.id,
        saved.countryCode,
        dto.statutoryFields,
      );
    }

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'worker.update',
      entityType: 'worker',
      entityId: saved.id,
      changes: {
        email: { old: before.email, new: saved.email },
        status: { old: before.status, new: saved.status },
        managerId: { old: before.managerId, new: saved.managerId },
      },
      correlationId,
      ipAddress,
    });

    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const contractorProfile = await this.contractorProfileRepository.findOne({
      where: { tenantId, workerId: saved.id },
    });

    const statutoryFields = await this.loadStatutoryMap(tenantId, saved.id);
    return toWorkerResponse(saved, auth, contractorProfile, statutoryFields);
  }

  async archive(
    id: string,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<void> {
    const worker = await this.getWorkerOrThrow(id, tenantId);

    await this.workerRepository.softDelete(worker.id);
    await this.workerRepository.update(worker.id, {
      status: WorkerStatus.ARCHIVED,
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'worker.archive',
      entityType: 'worker',
      entityId: worker.id,
      changes: {
        status: { old: worker.status, new: WorkerStatus.ARCHIVED },
      },
      correlationId,
      ipAddress,
    });
  }

  private validateStatutoryFields(
    countryCode: string,
    statutoryFields: Record<string, string>,
  ): void {
    const required = STATUTORY_FIELDS_BY_COUNTRY[countryCode] ?? [];
    const missing = required.filter(
      (field) => !statutoryFields[field]?.trim(),
    );

    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'STATUTORY_FIELDS_REQUIRED',
        message: `Missing statutory fields for ${countryCode}: ${missing.join(', ')}`,
        errors: missing.map((field) => ({
          code: 'STATUTORY_FIELD_REQUIRED',
          message: `${field} is required for ${countryCode}`,
          field: `statutoryFields.${field}`,
          status: 422,
        })),
      });
    }
  }

  private async replaceStatutoryFields(
    tenantId: string,
    workerId: string,
    countryCode: string,
    fields: Record<string, string>,
  ): Promise<void> {
    await this.workerStatutoryIdRepository.delete({ tenantId, workerId });
    const rows = statutoryRowsFromMap(tenantId, workerId, countryCode, fields);
    if (rows.length === 0) {
      return;
    }
    await this.workerStatutoryIdRepository.save(
      rows.map((row) => this.workerStatutoryIdRepository.create(row)),
    );
  }

  private async loadStatutoryMap(
    tenantId: string,
    workerId: string,
  ): Promise<Record<string, string>> {
    const rows = await this.workerStatutoryIdRepository.find({
      where: { tenantId, workerId },
    });
    return statutoryMapFromRows(rows);
  }

  private async loadStatutoryMapsForWorkers(
    tenantId: string,
    workerIds: string[],
  ): Promise<Map<string, Record<string, string>>> {
    const result = new Map<string, Record<string, string>>();
    if (workerIds.length === 0) {
      return result;
    }
    const rows = await this.workerStatutoryIdRepository
      .createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId })
      .andWhere('s.workerId IN (:...workerIds)', { workerIds })
      .getMany();
    for (const id of workerIds) {
      result.set(id, {});
    }
    for (const row of rows) {
      const map = result.get(row.workerId) ?? {};
      map[row.fieldKey] = row.fieldValue;
      result.set(row.workerId, map);
    }
    return result;
  }

  private async getWorkerOrThrow(
    id: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id, tenantId },
      relations: ['employmentType'],
    });

    if (!worker || worker.deletedAt) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    return worker;
  }

  private async assertCanAccessWorker(
    worker: WorkerEntity,
    auth: PolarisAuthContext,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    if (
      auth.roleCodes.some((code) =>
        [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
          code as PolarisRoleCode,
        ),
      )
    ) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    const canAccess = this.rowScopeService.canAccess(
      auth,
      {
        workerId: worker.id,
        divisionId: worker.divisionId,
        managerWorkerId: worker.managerId,
        legalEntityId: worker.legalEntityId,
        countryCode: worker.countryCode,
      },
      actingWorkerId,
    );

    if (!canAccess) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient scope to access this worker',
      });
    }
  }
}
