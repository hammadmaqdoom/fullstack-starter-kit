import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateProjectAssignmentDto,
  QueryProjectAssignmentsDto,
  UpdateProjectAssignmentDto,
} from './dto/project-assignment.dto';
import { ProjectAssignmentEntity } from './entities/project-assignment.entity';
import { WorkerEntity } from './entities/worker.entity';
import { resolveActingWorkerId } from './worker-scope.util';

/**
 * database-design.md `project_assignments` — effective-dated project lines
 * for workers. People Ops / Super Admin manage all; other roles may only
 * view assignments touching their own worker record.
 */
@Injectable()
export class ProjectAssignmentService {
  constructor(
    @InjectRepository(ProjectAssignmentEntity)
    private readonly projectAssignmentRepository: Repository<ProjectAssignmentEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async list(
    query: QueryProjectAssignmentsDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<ProjectAssignmentEntity>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = this.isPeopleOpsOrSuperAdmin(auth.roleCodes);

    const qb = this.projectAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.worker', 'worker')
      .leftJoinAndSelect('assignment.projectLead', 'projectLead')
      .where('assignment.tenantId = :tenantId', { tenantId })
      .orderBy('assignment.effectiveFrom', 'DESC');

    if (query.workerId) {
      qb.andWhere('assignment.workerId = :workerId', {
        workerId: query.workerId,
      });
    } else if (!isPrivileged) {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        actorId,
        tenantId,
      );
      if (!actingWorkerId) {
        return {
          items: [],
          meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
        };
      }
      qb.andWhere('assignment.workerId = :actingWorkerId', {
        actingWorkerId,
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
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

  async create(
    dto: CreateProjectAssignmentDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ProjectAssignmentEntity> {
    await this.assertPeopleOpsAuth(actorId, tenantId);
    await this.assertWorkersExist(dto.workerId, dto.projectLeadId, tenantId);

    const effectiveTo = dto.effectiveTo ?? null;
    this.validateDateRange(dto.effectiveFrom, effectiveTo);

    const saved = await this.projectAssignmentRepository.save(
      this.projectAssignmentRepository.create({
        tenantId,
        workerId: dto.workerId,
        projectName: dto.projectName,
        projectCode: dto.projectCode ?? null,
        projectLeadId: dto.projectLeadId ?? null,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'project_assignment.create',
      entityType: 'project_assignment',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        projectName: { old: null, new: saved.projectName },
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
    dto: UpdateProjectAssignmentDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ProjectAssignmentEntity> {
    await this.assertPeopleOpsAuth(actorId, tenantId);
    const assignment = await this.getAssignmentOrThrow(id, tenantId);
    const before = { ...assignment };

    if (dto.projectLeadId !== undefined) {
      await this.assertWorkersExist(
        assignment.workerId,
        dto.projectLeadId,
        tenantId,
      );
      assignment.projectLeadId = dto.projectLeadId;
    }
    if (dto.projectName !== undefined) {
      assignment.projectName = dto.projectName;
    }
    if (dto.projectCode !== undefined) {
      assignment.projectCode = dto.projectCode;
    }

    const effectiveFrom = dto.effectiveFrom ?? assignment.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo !== undefined ? dto.effectiveTo : assignment.effectiveTo;
    this.validateDateRange(effectiveFrom, effectiveTo);
    assignment.effectiveFrom = effectiveFrom;
    assignment.effectiveTo = effectiveTo;

    const saved = await this.projectAssignmentRepository.save(assignment);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'project_assignment.update',
      entityType: 'project_assignment',
      entityId: saved.id,
      changes: {
        projectName: { old: before.projectName, new: saved.projectName },
        projectLeadId: { old: before.projectLeadId, new: saved.projectLeadId },
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
    const assignment = await this.getAssignmentOrThrow(id, tenantId);

    await this.projectAssignmentRepository.remove(assignment);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'project_assignment.delete',
      entityType: 'project_assignment',
      entityId: assignment.id,
      changes: {
        workerId: { old: assignment.workerId, new: null },
        projectName: { old: assignment.projectName, new: null },
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
        code: 'PROJECT_ASSIGNMENT_ACCESS_DENIED',
        message: 'People Ops access required to manage project assignments',
      });
    }
  }

  private async assertWorkersExist(
    workerId: string,
    projectLeadId: string | undefined,
    tenantId: string,
  ): Promise<void> {
    const ids = [workerId, ...(projectLeadId ? [projectLeadId] : [])];
    const workers = await this.workerRepository.find({
      where: ids.map((id) => ({ id, tenantId })),
    });

    if (workers.length !== ids.length) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker or project lead not found',
      });
    }
  }

  private validateDateRange(
    effectiveFrom: string,
    effectiveTo: string | null,
  ): void {
    if (effectiveTo && effectiveFrom >= effectiveTo) {
      throw new BadRequestException({
        code: 'INVALID_PROJECT_ASSIGNMENT_DATES',
        message: 'effectiveTo must be after effectiveFrom',
      });
    }
  }

  private async getAssignmentOrThrow(
    id: string,
    tenantId: string,
  ): Promise<ProjectAssignmentEntity> {
    const assignment = await this.projectAssignmentRepository.findOne({
      where: { id, tenantId },
    });

    if (!assignment) {
      throw new NotFoundException({
        code: 'PROJECT_ASSIGNMENT_NOT_FOUND',
        message: 'Project assignment not found',
      });
    }

    return assignment;
  }
}
