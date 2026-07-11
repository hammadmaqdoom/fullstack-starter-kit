import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateApprovalDelegationDto,
  UpdateApprovalDelegationDto,
} from './dto/approval-delegation.dto';
import { ApprovalDelegationEntity } from './entities/approval-delegation.entity';
import { WorkerEntity } from './entities/worker.entity';
import { DelegationScope } from './enums/delegation.enum';
import { resolveActingWorkerId } from './worker-scope.util';

@Injectable()
export class ApprovalDelegationService {
  constructor(
    @InjectRepository(ApprovalDelegationEntity)
    private readonly delegationRepository: Repository<ApprovalDelegationEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async list(
    actorId: string,
    delegatorWorkerId?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ApprovalDelegationEntity[]> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const isPrivileged = auth.roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );

    const qb = this.delegationRepository
      .createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.delegatorWorker', 'delegatorWorker')
      .leftJoinAndSelect('delegation.delegateWorker', 'delegateWorker')
      .where('delegation.tenantId = :tenantId', { tenantId })
      .orderBy('delegation.effectiveFrom', 'DESC');

    if (delegatorWorkerId) {
      qb.andWhere('delegation.delegatorWorkerId = :delegatorWorkerId', {
        delegatorWorkerId,
      });
    } else if (!isPrivileged && actingWorkerId) {
      qb.andWhere(
        '(delegation.delegatorWorkerId = :actingWorkerId OR delegation.delegateWorkerId = :actingWorkerId)',
        { actingWorkerId },
      );
    } else if (!isPrivileged) {
      return [];
    }

    return qb.getMany();
  }

  async create(
    dto: CreateApprovalDelegationDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ApprovalDelegationEntity> {
    await this.assertCanManageDelegation(
      actorId,
      dto.delegatorWorkerId,
      tenantId,
    );

    if (dto.delegatorWorkerId === dto.delegateWorkerId) {
      throw new BadRequestException({
        code: 'DELEGATION_SELF_NOT_ALLOWED',
        message: 'Delegator and delegate must be different workers',
      });
    }

    await this.assertWorkersExist(
      dto.delegatorWorkerId,
      dto.delegateWorkerId,
      tenantId,
    );

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = new Date(dto.effectiveTo);
    this.validateDateRange(effectiveFrom, effectiveTo);

    await this.assertNoOverlap(
      dto.delegatorWorkerId,
      dto.scope ?? DelegationScope.APPROVALS,
      effectiveFrom,
      effectiveTo,
      tenantId,
    );

    const saved = await this.delegationRepository.save(
      this.delegationRepository.create({
        tenantId,
        delegatorWorkerId: dto.delegatorWorkerId,
        delegateWorkerId: dto.delegateWorkerId,
        scope: dto.scope ?? DelegationScope.APPROVALS,
        effectiveFrom,
        effectiveTo,
        reason: dto.reason ?? null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'approval_delegation.create',
      entityType: 'approval_delegation',
      entityId: saved.id,
      changes: {
        delegatorWorkerId: { old: null, new: saved.delegatorWorkerId },
        delegateWorkerId: { old: null, new: saved.delegateWorkerId },
        scope: { old: null, new: saved.scope },
        effectiveFrom: { old: null, new: saved.effectiveFrom.toISOString() },
        effectiveTo: { old: null, new: saved.effectiveTo.toISOString() },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateApprovalDelegationDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ApprovalDelegationEntity> {
    const delegation = await this.getDelegationOrThrow(id, tenantId);
    await this.assertCanManageDelegation(
      actorId,
      delegation.delegatorWorkerId,
      tenantId,
    );

    const before = { ...delegation };

    if (dto.delegateWorkerId) {
      if (dto.delegateWorkerId === delegation.delegatorWorkerId) {
        throw new BadRequestException({
          code: 'DELEGATION_SELF_NOT_ALLOWED',
          message: 'Delegator and delegate must be different workers',
        });
      }
      await this.assertWorkersExist(
        delegation.delegatorWorkerId,
        dto.delegateWorkerId,
        tenantId,
      );
      delegation.delegateWorkerId = dto.delegateWorkerId;
    }

    if (dto.scope !== undefined) {
      delegation.scope = dto.scope;
    }
    if (dto.reason !== undefined) {
      delegation.reason = dto.reason;
    }

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : delegation.effectiveFrom;
    const effectiveTo = dto.effectiveTo
      ? new Date(dto.effectiveTo)
      : delegation.effectiveTo;
    this.validateDateRange(effectiveFrom, effectiveTo);

    await this.assertNoOverlap(
      delegation.delegatorWorkerId,
      delegation.scope,
      effectiveFrom,
      effectiveTo,
      tenantId,
      delegation.id,
    );

    delegation.effectiveFrom = effectiveFrom;
    delegation.effectiveTo = effectiveTo;

    const saved = await this.delegationRepository.save(delegation);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'approval_delegation.update',
      entityType: 'approval_delegation',
      entityId: saved.id,
      changes: {
        delegateWorkerId: {
          old: before.delegateWorkerId,
          new: saved.delegateWorkerId,
        },
        scope: { old: before.scope, new: saved.scope },
        effectiveFrom: {
          old: before.effectiveFrom.toISOString(),
          new: saved.effectiveFrom.toISOString(),
        },
        effectiveTo: {
          old: before.effectiveTo.toISOString(),
          new: saved.effectiveTo.toISOString(),
        },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async remove(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<void> {
    const delegation = await this.getDelegationOrThrow(id, tenantId);
    await this.assertCanManageDelegation(
      actorId,
      delegation.delegatorWorkerId,
      tenantId,
    );

    await this.delegationRepository.remove(delegation);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'approval_delegation.delete',
      entityType: 'approval_delegation',
      entityId: delegation.id,
      changes: {
        delegatorWorkerId: {
          old: delegation.delegatorWorkerId,
          new: null,
        },
        delegateWorkerId: {
          old: delegation.delegateWorkerId,
          new: null,
        },
      },
      correlationId,
      ipAddress,
    });
  }

  private async assertCanManageDelegation(
    actorId: string,
    delegatorWorkerId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = auth.roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );

    if (isPrivileged) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const isManager = auth.roleCodes.includes(PolarisRoleCode.MANAGER);

    if (!isManager || actingWorkerId !== delegatorWorkerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to manage this delegation',
      });
    }
  }

  private async assertWorkersExist(
    delegatorWorkerId: string,
    delegateWorkerId: string,
    tenantId: string,
  ): Promise<void> {
    const workers = await this.workerRepository.find({
      where: [
        { id: delegatorWorkerId, tenantId },
        { id: delegateWorkerId, tenantId },
      ],
    });

    if (workers.length !== 2) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Delegator or delegate worker not found',
      });
    }
  }

  private validateDateRange(effectiveFrom: Date, effectiveTo: Date): void {
    if (effectiveFrom >= effectiveTo) {
      throw new BadRequestException({
        code: 'INVALID_DELEGATION_DATES',
        message: 'effectiveTo must be after effectiveFrom',
      });
    }
  }

  private async assertNoOverlap(
    delegatorWorkerId: string,
    scope: DelegationScope,
    effectiveFrom: Date,
    effectiveTo: Date,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.delegationRepository
      .createQueryBuilder('delegation')
      .where('delegation.tenantId = :tenantId', { tenantId })
      .andWhere('delegation.delegatorWorkerId = :delegatorWorkerId', {
        delegatorWorkerId,
      })
      .andWhere('delegation.scope = :scope', { scope })
      .andWhere('delegation.effectiveFrom < :effectiveTo', { effectiveTo })
      .andWhere('delegation.effectiveTo > :effectiveFrom', { effectiveFrom });

    if (excludeId) {
      qb.andWhere('delegation.id != :excludeId', { excludeId });
    }

    const overlap = await qb.getOne();
    if (overlap) {
      throw new BadRequestException({
        code: 'DELEGATION_OVERLAP',
        message: 'An overlapping delegation already exists for this period',
      });
    }
  }

  private async getDelegationOrThrow(
    id: string,
    tenantId: string,
  ): Promise<ApprovalDelegationEntity> {
    const delegation = await this.delegationRepository.findOne({
      where: { id, tenantId },
    });

    if (!delegation) {
      throw new NotFoundException({
        code: 'APPROVAL_DELEGATION_NOT_FOUND',
        message: 'Approval delegation not found',
      });
    }

    return delegation;
  }
}
