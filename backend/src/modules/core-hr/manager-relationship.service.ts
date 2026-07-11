import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
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
  CreateManagerRelationshipDto,
  UpdateManagerRelationshipDto,
} from './dto/manager-relationship.dto';
import { ManagerRelationshipEntity } from './entities/manager-relationship.entity';
import { WorkerEntity } from './entities/worker.entity';
import { RelationshipType } from './enums/org.enum';
import { resolveActingWorkerId } from './worker-scope.util';

/**
 * FLW-HR-* / enterprise-readiness.md §3.2 — effective-dated manager lines.
 * People Ops / Super Admin manage all relationships; managers and division
 * heads may only *view* the lines that touch their own team.
 */
@Injectable()
export class ManagerRelationshipService {
  constructor(
    @InjectRepository(ManagerRelationshipEntity)
    private readonly relationshipRepository: Repository<ManagerRelationshipEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async list(
    actorId: string,
    workerId?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ManagerRelationshipEntity[]> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = this.isPeopleOpsOrSuperAdmin(auth.roleCodes);

    const qb = this.relationshipRepository
      .createQueryBuilder('relationship')
      .leftJoinAndSelect('relationship.worker', 'worker')
      .leftJoinAndSelect('relationship.manager', 'manager')
      .where('relationship.tenantId = :tenantId', { tenantId })
      .orderBy('relationship.effectiveFrom', 'DESC');

    if (workerId) {
      qb.andWhere('relationship.workerId = :workerId', { workerId });
    } else if (!isPrivileged) {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        actorId,
        tenantId,
      );
      if (!actingWorkerId) {
        return [];
      }
      qb.andWhere(
        '(relationship.workerId = :actingWorkerId OR relationship.managerId = :actingWorkerId)',
        { actingWorkerId },
      );
    }

    return qb.getMany();
  }

  async create(
    dto: CreateManagerRelationshipDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ManagerRelationshipEntity> {
    await this.assertPeopleOpsAuth(actorId, tenantId);

    if (dto.workerId === dto.managerId) {
      throw new BadRequestException({
        code: 'MANAGER_RELATIONSHIP_SELF_NOT_ALLOWED',
        message: 'A worker cannot be their own manager',
      });
    }

    await this.assertWorkersExist(dto.workerId, dto.managerId, tenantId);

    const relationshipType = dto.relationshipType ?? RelationshipType.DIRECT;
    const effectiveFrom = dto.effectiveFrom;
    const effectiveTo = dto.effectiveTo ?? null;
    this.validateDateRange(effectiveFrom, effectiveTo);

    await this.assertNoOverlap(
      dto.workerId,
      relationshipType,
      effectiveFrom,
      effectiveTo,
      tenantId,
    );

    const saved = await this.relationshipRepository.save(
      this.relationshipRepository.create({
        tenantId,
        workerId: dto.workerId,
        managerId: dto.managerId,
        relationshipType,
        effectiveFrom,
        effectiveTo,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'manager_relationship.create',
      entityType: 'manager_relationship',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        managerId: { old: null, new: saved.managerId },
        relationshipType: { old: null, new: saved.relationshipType },
        effectiveFrom: { old: null, new: saved.effectiveFrom },
        effectiveTo: { old: null, new: saved.effectiveTo },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateManagerRelationshipDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ManagerRelationshipEntity> {
    await this.assertPeopleOpsAuth(actorId, tenantId);
    const relationship = await this.getRelationshipOrThrow(id, tenantId);
    const before = { ...relationship };

    if (dto.managerId !== undefined) {
      if (dto.managerId === relationship.workerId) {
        throw new BadRequestException({
          code: 'MANAGER_RELATIONSHIP_SELF_NOT_ALLOWED',
          message: 'A worker cannot be their own manager',
        });
      }
      await this.assertWorkersExist(
        relationship.workerId,
        dto.managerId,
        tenantId,
      );
      relationship.managerId = dto.managerId;
    }

    if (dto.relationshipType !== undefined) {
      relationship.relationshipType = dto.relationshipType;
    }

    const effectiveFrom = dto.effectiveFrom ?? relationship.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo !== undefined
        ? dto.effectiveTo
        : relationship.effectiveTo;
    this.validateDateRange(effectiveFrom, effectiveTo);

    await this.assertNoOverlap(
      relationship.workerId,
      relationship.relationshipType,
      effectiveFrom,
      effectiveTo,
      tenantId,
      relationship.id,
    );

    relationship.effectiveFrom = effectiveFrom;
    relationship.effectiveTo = effectiveTo;

    const saved = await this.relationshipRepository.save(relationship);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'manager_relationship.update',
      entityType: 'manager_relationship',
      entityId: saved.id,
      changes: {
        managerId: { old: before.managerId, new: saved.managerId },
        relationshipType: {
          old: before.relationshipType,
          new: saved.relationshipType,
        },
        effectiveFrom: { old: before.effectiveFrom, new: saved.effectiveFrom },
        effectiveTo: { old: before.effectiveTo, new: saved.effectiveTo },
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
    await this.assertPeopleOpsAuth(actorId, tenantId);
    const relationship = await this.getRelationshipOrThrow(id, tenantId);

    await this.relationshipRepository.remove(relationship);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'manager_relationship.delete',
      entityType: 'manager_relationship',
      entityId: relationship.id,
      changes: {
        workerId: { old: relationship.workerId, new: null },
        managerId: { old: relationship.managerId, new: null },
      },
      correlationId,
      ipAddress,
    });
  }

  private isPeopleOpsOrSuperAdmin(roleCodes: string[]): boolean {
    return roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );
  }

  private async assertPeopleOpsAuth(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (!this.isPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      throw new ForbiddenException({
        code: 'MANAGER_RELATIONSHIP_ACCESS_DENIED',
        message: 'People Ops access required to manage manager relationships',
      });
    }
  }

  private async assertWorkersExist(
    workerId: string,
    managerId: string,
    tenantId: string,
  ): Promise<void> {
    const workers = await this.workerRepository.find({
      where: [
        { id: workerId, tenantId },
        { id: managerId, tenantId },
      ],
    });

    if (workers.length !== 2) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker or manager not found',
      });
    }
  }

  private validateDateRange(
    effectiveFrom: string,
    effectiveTo: string | null,
  ): void {
    if (effectiveTo && effectiveFrom >= effectiveTo) {
      throw new BadRequestException({
        code: 'INVALID_MANAGER_RELATIONSHIP_DATES',
        message: 'effectiveTo must be after effectiveFrom',
      });
    }
  }

  private async assertNoOverlap(
    workerId: string,
    relationshipType: RelationshipType,
    effectiveFrom: string,
    effectiveTo: string | null,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.relationshipRepository
      .createQueryBuilder('relationship')
      .where('relationship.tenantId = :tenantId', { tenantId })
      .andWhere('relationship.workerId = :workerId', { workerId })
      .andWhere('relationship.relationshipType = :relationshipType', {
        relationshipType,
      })
      .andWhere(
        '(relationship.effectiveTo IS NULL OR relationship.effectiveTo > :effectiveFrom)',
        { effectiveFrom },
      );

    if (effectiveTo) {
      qb.andWhere('relationship.effectiveFrom < :effectiveTo', { effectiveTo });
    }

    if (excludeId) {
      qb.andWhere('relationship.id != :excludeId', { excludeId });
    }

    const overlap = await qb.getOne();
    if (overlap) {
      throw new BadRequestException({
        code: 'MANAGER_RELATIONSHIP_OVERLAP',
        message:
          'An overlapping manager relationship of this type already exists for the worker',
      });
    }
  }

  private async getRelationshipOrThrow(
    id: string,
    tenantId: string,
  ): Promise<ManagerRelationshipEntity> {
    const relationship = await this.relationshipRepository.findOne({
      where: { id, tenantId },
    });

    if (!relationship) {
      throw new NotFoundException({
        code: 'MANAGER_RELATIONSHIP_NOT_FOUND',
        message: 'Manager relationship not found',
      });
    }

    return relationship;
  }
}
