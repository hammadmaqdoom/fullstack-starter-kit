import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  CreateTravelRequestDto,
  QueryTravelRequestsDto,
  ReconcileTravelRequestDto,
  RejectTravelRequestDto,
  TravelItineraryDto,
  UpdateTravelRequestDto,
  UpsertTravelApprovalRuleDto,
} from './dto/travel-request.dto';
import { TravelApprovalRuleEntity } from './entities/travel-approval-rule.entity';
import { TravelItineraryEntity } from './entities/travel-itinerary.entity';
import { TravelRequestEntity } from './entities/travel-request.entity';
import { TravelRequestStatus, TravelType } from './enums/travel.enum';

/**
 * FLW-OPS-002 — travel request submission and approval chain (PRD §6.17).
 * Manager → Finance (if `estimatedCost` >= configured threshold) →
 * People Ops (if international and configured) — resolved via
 * `travel_approval_rules`, never hard-coded per country.
 */
@Injectable()
export class TravelRequestService {
  constructor(
    @InjectRepository(TravelRequestEntity)
    private readonly requestRepository: Repository<TravelRequestEntity>,
    @InjectRepository(TravelApprovalRuleEntity)
    private readonly approvalRuleRepository: Repository<TravelApprovalRuleEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: QueryTravelRequestsDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<TravelRequestEntity>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes);
    const isManager = auth.roleCodes.includes(PolarisRoleCode.MANAGER);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.itineraries', 'itineraries')
      .where('request.tenantId = :tenantId', { tenantId })
      .orderBy('request.createdAt', 'DESC');

    if (isPrivileged) {
      if (query.workerId) {
        qb.andWhere('request.workerId = :targetWorkerId', {
          targetWorkerId: query.workerId,
        });
      }
    } else {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        actorId,
        tenantId,
      );
      if (!actingWorkerId) {
        return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }

      if (query.workerId && query.workerId !== actingWorkerId) {
        const canViewTeamMember =
          isManager &&
          (await this.isManagedBy(query.workerId, actingWorkerId, tenantId));
        if (!canViewTeamMember) {
          throw new ForbiddenException({
            code: 'TRAVEL_REQUEST_ACCESS_DENIED',
            message: 'Cannot list travel requests for another worker',
          });
        }
        qb.andWhere('request.workerId = :targetWorkerId', {
          targetWorkerId: query.workerId,
        });
      } else if (isManager) {
        qb.leftJoin('request.worker', 'worker').andWhere(
          '(request.workerId = :actingWorkerId OR worker.managerId = :actingWorkerId)',
          { actingWorkerId },
        );
      } else {
        qb.andWhere('request.workerId = :actingWorkerId', { actingWorkerId });
      }
    }

    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
    }

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId, ['itineraries']);
    await this.assertCanView(request, actorId, tenantId);
    return request;
  }

  async create(
    dto: CreateTravelRequestDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const workerId = this.resolveWorkerIdForCreate(
      dto.workerId,
      actingWorkerId,
      isPrivileged,
    );

    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const request = manager.create(TravelRequestEntity, {
        tenantId,
        workerId,
        destinations: dto.destinations,
        startDate: dto.startDate,
        endDate: dto.endDate,
        purpose: dto.purpose,
        travelType: dto.travelType,
        estimatedCost: dto.estimatedCost.toFixed(2),
        currencyCode: dto.currencyCode.toUpperCase(),
        status: TravelRequestStatus.DRAFT,
      });
      const savedRequest = await manager.save(request);

      if (dto.itineraries?.length) {
        savedRequest.itineraries = await manager.save(
          this.buildItineraryEntities(
            manager,
            dto.itineraries,
            tenantId,
            savedRequest.id,
          ),
        );
      }

      return savedRequest;
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'travel_request.create',
      entityType: 'travel_request',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        travelType: { old: null, new: saved.travelType },
        estimatedCost: { old: null, new: saved.estimatedCost },
        status: { old: null, new: saved.status },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateTravelRequestDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId, ['itineraries']);
    await this.assertOwnerOrPrivileged(request.workerId, actorId, tenantId);
    this.assertStatus(request, [TravelRequestStatus.DRAFT], 'update');

    if (dto.destinations !== undefined) {
      request.destinations = dto.destinations;
    }
    if (dto.startDate !== undefined) {
      request.startDate = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      request.endDate = dto.endDate;
    }
    if (dto.purpose !== undefined) {
      request.purpose = dto.purpose;
    }
    if (dto.travelType !== undefined) {
      request.travelType = dto.travelType;
    }
    if (dto.estimatedCost !== undefined) {
      request.estimatedCost = dto.estimatedCost.toFixed(2);
    }
    if (dto.currencyCode !== undefined) {
      request.currencyCode = dto.currencyCode.toUpperCase();
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      if (dto.itineraries) {
        await manager.delete(TravelItineraryEntity, {
          travelRequestId: request.id,
        });
        request.itineraries = await manager.save(
          this.buildItineraryEntities(
            manager,
            dto.itineraries,
            tenantId,
            request.id,
          ),
        );
      }
      return manager.save(TravelRequestEntity, request);
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'travel_request.update',
      entityType: 'travel_request',
      entityId: saved.id,
      changes: { estimatedCost: { old: null, new: saved.estimatedCost } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async addItinerary(
    id: string,
    dto: TravelItineraryDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId, ['itineraries']);
    await this.assertOwnerOrPrivileged(request.workerId, actorId, tenantId);

    const itinerary = this.requestRepository.manager.create(
      TravelItineraryEntity,
      {
        tenantId,
        travelRequestId: request.id,
        legType: dto.legType,
        description: dto.description,
        departureAt: dto.departureAt ? new Date(dto.departureAt) : null,
        arrivalAt: dto.arrivalAt ? new Date(dto.arrivalAt) : null,
        notes: dto.notes ?? null,
      },
    );
    await this.requestRepository.manager.save(itinerary);

    return this.getRequestOrThrow(id, tenantId, ['itineraries']);
  }

  async submit(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertOwnerOrPrivileged(request.workerId, actorId, tenantId);
    this.assertStatus(request, [TravelRequestStatus.DRAFT], 'submit');

    const before = request.status;
    request.status = TravelRequestStatus.SUBMITTED;
    const saved = await this.requestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'travel_request.submit',
      entityType: 'travel_request',
      entityId: saved.id,
      changes: { status: { old: before, new: saved.status } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async approveManager(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertManagerOrPrivileged(request.workerId, actorId, tenantId);
    this.assertStatus(
      request,
      [TravelRequestStatus.SUBMITTED],
      'approve-manager',
    );

    request.managerApprovedBy = actorId;
    request.managerApprovedAt = new Date();
    return this.finalizeApprovalStep(
      request,
      actorId,
      'travel_request.approve_manager',
      correlationId,
      ipAddress,
      tenantId,
    );
  }

  async approveFinance(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertFinanceAuth(actorId, tenantId);
    this.assertStatus(
      request,
      [TravelRequestStatus.SUBMITTED],
      'approve-finance',
    );
    if (!request.managerApprovedAt) {
      throw new BadRequestException({
        code: 'TRAVEL_REQUEST_MANAGER_APPROVAL_REQUIRED',
        message: 'Manager approval is required before Finance approval',
      });
    }

    request.financeApprovedBy = actorId;
    request.financeApprovedAt = new Date();
    return this.finalizeApprovalStep(
      request,
      actorId,
      'travel_request.approve_finance',
      correlationId,
      ipAddress,
      tenantId,
    );
  }

  async approvePeopleOps(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertPeopleOpsAuth(actorId, tenantId);
    this.assertStatus(
      request,
      [TravelRequestStatus.SUBMITTED],
      'approve-people-ops',
    );
    if (!request.managerApprovedAt) {
      throw new BadRequestException({
        code: 'TRAVEL_REQUEST_MANAGER_APPROVAL_REQUIRED',
        message: 'Manager approval is required before People Ops approval',
      });
    }

    request.peopleOpsApprovedBy = actorId;
    request.peopleOpsApprovedAt = new Date();
    return this.finalizeApprovalStep(
      request,
      actorId,
      'travel_request.approve_people_ops',
      correlationId,
      ipAddress,
      tenantId,
    );
  }

  async reject(
    id: string,
    dto: RejectTravelRequestDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertManagerOrPrivileged(request.workerId, actorId, tenantId);
    this.assertStatus(request, [TravelRequestStatus.SUBMITTED], 'reject');

    const before = request.status;
    request.status = TravelRequestStatus.REJECTED;
    request.rejectionReason = dto.reason;
    const saved = await this.requestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'travel_request.reject',
      entityType: 'travel_request',
      entityId: saved.id,
      changes: {
        status: { old: before, new: saved.status },
        rejectionReason: { old: null, new: saved.rejectionReason },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async markInProgress(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertOwnerOrPrivileged(request.workerId, actorId, tenantId);
    this.assertStatus(
      request,
      [TravelRequestStatus.APPROVED],
      'mark-in-progress',
    );

    request.status = TravelRequestStatus.IN_PROGRESS;
    return this.requestRepository.save(request);
  }

  async markCompleted(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertOwnerOrPrivileged(request.workerId, actorId, tenantId);
    this.assertStatus(
      request,
      [TravelRequestStatus.APPROVED, TravelRequestStatus.IN_PROGRESS],
      'mark-completed',
    );

    request.status = TravelRequestStatus.COMPLETED;
    return this.requestRepository.save(request);
  }

  async reconcile(
    id: string,
    dto: ReconcileTravelRequestDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelRequestEntity> {
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertFinanceAuth(actorId, tenantId);
    this.assertStatus(request, [TravelRequestStatus.COMPLETED], 'reconcile');

    request.actualCost = dto.actualCost.toFixed(2);
    request.status = TravelRequestStatus.RECONCILED;
    const saved = await this.requestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'travel_request.reconcile',
      entityType: 'travel_request',
      entityId: saved.id,
      changes: {
        actualCost: { old: null, new: saved.actualCost },
        status: { old: TravelRequestStatus.COMPLETED, new: saved.status },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async getApprovalRule(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelApprovalRuleEntity | null> {
    return this.approvalRuleRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async upsertApprovalRule(
    dto: UpsertTravelApprovalRuleDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TravelApprovalRuleEntity> {
    const rule = this.approvalRuleRepository.create({
      tenantId,
      amountThreshold:
        dto.amountThreshold !== undefined
          ? dto.amountThreshold.toFixed(2)
          : null,
      currencyCode: dto.currencyCode?.toUpperCase() ?? null,
      requireFinance: dto.requireFinance,
      requirePeopleOpsForInternational: dto.requirePeopleOpsForInternational,
    });
    const saved = await this.approvalRuleRepository.save(rule);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'travel_approval_rule.upsert',
      entityType: 'travel_approval_rule',
      entityId: saved.id,
      changes: {
        requireFinance: { old: null, new: saved.requireFinance },
        requirePeopleOpsForInternational: {
          old: null,
          new: saved.requirePeopleOpsForInternational,
        },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  private async finalizeApprovalStep(
    request: TravelRequestEntity,
    actorId: string,
    action: string,
    correlationId: string | undefined,
    ipAddress: string | undefined,
    tenantId: string,
  ): Promise<TravelRequestEntity> {
    const rule = await this.getApprovalRule(tenantId);
    const before = request.status;

    if (this.isFullyApproved(request, rule)) {
      request.status = TravelRequestStatus.APPROVED;
    }

    const saved = await this.requestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action,
      entityType: 'travel_request',
      entityId: saved.id,
      changes: { status: { old: before, new: saved.status } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  private isFullyApproved(
    request: TravelRequestEntity,
    rule: TravelApprovalRuleEntity | null,
  ): boolean {
    if (!request.managerApprovedAt) {
      return false;
    }

    const financeRequired = this.isFinanceRequired(request, rule);
    if (financeRequired && !request.financeApprovedAt) {
      return false;
    }

    const peopleOpsRequired = this.isPeopleOpsRequired(request, rule);
    if (peopleOpsRequired && !request.peopleOpsApprovedAt) {
      return false;
    }

    return true;
  }

  private isFinanceRequired(
    request: TravelRequestEntity,
    rule: TravelApprovalRuleEntity | null,
  ): boolean {
    if (!rule?.requireFinance) {
      return false;
    }
    if (!rule.amountThreshold) {
      return true;
    }
    return Number(request.estimatedCost) >= Number(rule.amountThreshold);
  }

  private isPeopleOpsRequired(
    request: TravelRequestEntity,
    rule: TravelApprovalRuleEntity | null,
  ): boolean {
    return (
      !!rule?.requirePeopleOpsForInternational &&
      request.travelType === TravelType.INTERNATIONAL
    );
  }

  private buildItineraryEntities(
    manager: EntityManager,
    itineraries: TravelItineraryDto[],
    tenantId: string,
    travelRequestId: string,
  ): TravelItineraryEntity[] {
    return itineraries.map((leg) =>
      manager.create(TravelItineraryEntity, {
        tenantId,
        travelRequestId,
        legType: leg.legType,
        description: leg.description,
        departureAt: leg.departureAt ? new Date(leg.departureAt) : null,
        arrivalAt: leg.arrivalAt ? new Date(leg.arrivalAt) : null,
        notes: leg.notes ?? null,
      }),
    );
  }

  private async isManagedBy(
    workerId: string,
    managerWorkerId: string,
    tenantId: string,
  ): Promise<boolean> {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    return worker?.managerId === managerWorkerId;
  }

  private resolveWorkerIdForCreate(
    dtoWorkerId: string | undefined,
    actingWorkerId: string | null,
    isPrivileged: boolean,
  ): string {
    if (isPrivileged) {
      const workerId = dtoWorkerId ?? actingWorkerId;
      if (!workerId) {
        throw new BadRequestException({
          code: 'TRAVEL_REQUEST_WORKER_REQUIRED',
          message: 'workerId is required',
        });
      }
      return workerId;
    }

    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'TRAVEL_REQUEST_ACCESS_DENIED',
        message: 'No worker profile linked to this account',
      });
    }
    if (dtoWorkerId && dtoWorkerId !== actingWorkerId) {
      throw new ForbiddenException({
        code: 'TRAVEL_REQUEST_ACCESS_DENIED',
        message: 'Cannot create a travel request for another worker',
      });
    }
    return actingWorkerId;
  }

  private isFinanceOrPeopleOpsOrSuperAdmin(roleCodes: string[]): boolean {
    return roleCodes.some((code) =>
      [
        PolarisRoleCode.FINANCE,
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
      ].includes(code as PolarisRoleCode),
    );
  }

  private async assertFinanceAuth(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (
      !auth.roleCodes.some((code) =>
        [PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN].includes(
          code as PolarisRoleCode,
        ),
      )
    ) {
      throw new ForbiddenException({
        code: 'TRAVEL_REQUEST_ACCESS_DENIED',
        message: 'Finance access required for this action',
      });
    }
  }

  private async assertPeopleOpsAuth(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (
      !auth.roleCodes.some((code) =>
        [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
          code as PolarisRoleCode,
        ),
      )
    ) {
      throw new ForbiddenException({
        code: 'TRAVEL_REQUEST_ACCESS_DENIED',
        message: 'People Ops access required for this action',
      });
    }
  }

  private async assertOwnerOrPrivileged(
    requestWorkerId: string,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (!actingWorkerId || actingWorkerId !== requestWorkerId) {
      throw new ForbiddenException({
        code: 'TRAVEL_REQUEST_ACCESS_DENIED',
        message:
          'Only the traveller or Finance/People Ops may manage this request',
      });
    }
  }

  private async assertManagerOrPrivileged(
    requestWorkerId: string,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      return;
    }

    if (auth.roleCodes.includes(PolarisRoleCode.MANAGER)) {
      const [worker, actingWorkerId] = await Promise.all([
        this.workerRepository.findOne({
          where: { id: requestWorkerId, tenantId },
        }),
        resolveActingWorkerId(this.workerRepository, actorId, tenantId),
      ]);
      if (
        worker &&
        actingWorkerId &&
        worker.managerId === actingWorkerId &&
        requestWorkerId !== actingWorkerId
      ) {
        return;
      }
    }

    throw new ForbiddenException({
      code: 'TRAVEL_REQUEST_ACCESS_DENIED',
      message: 'Manager or Finance/People Ops access required',
    });
  }

  private async assertCanView(
    request: TravelRequestEntity,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (actingWorkerId && actingWorkerId === request.workerId) {
      return;
    }

    if (auth.roleCodes.includes(PolarisRoleCode.MANAGER) && actingWorkerId) {
      const worker = await this.workerRepository.findOne({
        where: { id: request.workerId, tenantId },
      });
      if (worker && worker.managerId === actingWorkerId) {
        return;
      }
    }

    throw new ForbiddenException({
      code: 'TRAVEL_REQUEST_ACCESS_DENIED',
      message: 'Insufficient permissions to view this travel request',
    });
  }

  private assertStatus(
    request: TravelRequestEntity,
    allowed: TravelRequestStatus[],
    action: string,
  ): void {
    if (!allowed.includes(request.status)) {
      throw new BadRequestException({
        code: 'TRAVEL_REQUEST_INVALID_STATUS',
        message: `Cannot ${action} a travel request in status ${request.status}`,
      });
    }
  }

  private async getRequestOrThrow(
    id: string,
    tenantId: string,
    relations: string[] = [],
  ): Promise<TravelRequestEntity> {
    const request = await this.requestRepository.findOne({
      where: { id, tenantId },
      relations,
    });

    if (!request) {
      throw new NotFoundException({
        code: 'TRAVEL_REQUEST_NOT_FOUND',
        message: 'Travel request not found',
      });
    }

    return request;
  }
}
