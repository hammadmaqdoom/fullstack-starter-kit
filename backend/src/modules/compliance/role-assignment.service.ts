import { UserEntity } from '@/auth/entities/user.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, In, Not, Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import {
  CreateUserRoleAssignmentDto,
  QueryUserRoleAssignmentsDto,
  UpdateUserRoleAssignmentDto,
} from './dto/role-assignment.dto';
import { RoleEntity } from './entities/role.entity';
import { UserRoleAssignmentEntity } from './entities/user-role-assignment.entity';
import { ScopeType } from './enums/scope-type.enum';

export type RoleAssignmentListItem = UserRoleAssignmentEntity & {
  userEmail?: string | null;
  userName?: string | null;
  roleCode?: string | null;
  roleName?: string | null;
};

export type AssignableUser = {
  userId: string;
  email: string;
  name: string;
  workerId: string | null;
};

@Injectable()
export class RoleAssignmentService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleAssignmentEntity)
    private readonly assignmentRepository: Repository<UserRoleAssignmentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  listRoles(tenantId: string): Promise<RoleEntity[]> {
    return this.roleRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async listAssignments(
    tenantId: string,
    query: QueryUserRoleAssignmentsDto = {},
  ): Promise<RoleAssignmentListItem[]> {
    const qb = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.role', 'role')
      .leftJoinAndSelect('assignment.user', 'user')
      .where('assignment.tenantId = :tenantId', { tenantId })
      .orderBy('assignment.createdAt', 'DESC');

    if (query.userId) {
      qb.andWhere('assignment.userId = :userId', { userId: query.userId });
    }
    if (query.roleId) {
      qb.andWhere('assignment.roleId = :roleId', { roleId: query.roleId });
    }

    const activeOnly = query.activeOnly !== 'false';
    if (activeOnly) {
      const today = new Date().toISOString().slice(0, 10);
      qb.andWhere(
        '(assignment.effectiveFrom IS NULL OR assignment.effectiveFrom <= :today)',
        { today },
      );
      qb.andWhere(
        '(assignment.effectiveTo IS NULL OR assignment.effectiveTo > :today)',
        { today },
      );
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.toListItem(row));
  }

  async listAssignableUsers(tenantId: string): Promise<AssignableUser[]> {
    const workers = await this.workerRepository.find({
      where: { tenantId, userId: Not(IsNull()) },
      order: { lastName: 'ASC', firstName: 'ASC' },
      take: 500,
    });

    const userIds = [
      ...new Set(
        workers
          .map((w) => w.userId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    return workers
      .filter((w) => w.userId && userById.has(w.userId))
      .map((w) => {
        const user = userById.get(w.userId!)!;
        const name
          = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
            || [w.firstName, w.lastName].filter(Boolean).join(' ').trim()
            || user.email;
        return {
          userId: w.userId!,
          email: user.email,
          name,
          workerId: w.id,
        };
      });
  }

  async getAssignment(
    id: string,
    tenantId: string,
  ): Promise<UserRoleAssignmentEntity> {
    const row = await this.assignmentRepository.findOne({
      where: { id, tenantId },
      relations: ['role', 'user'],
    });
    if (!row) {
      throw new NotFoundException({
        code: 'USER_ROLE_NOT_FOUND',
        message: 'Role assignment not found',
      });
    }
    return row;
  }

  async createAssignment(
    dto: CreateUserRoleAssignmentDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<RoleAssignmentListItem> {
    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId, tenantId },
    });
    if (!role) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: 'Role not found',
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const scopeType = dto.scopeType ?? ScopeType.OWN;
    this.assertScope(scopeType, dto.scopeId, dto.scopeCountryCode);

    const row = await this.assignmentRepository.save(
      this.assignmentRepository.create({
        tenantId,
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType,
        scopeId: dto.scopeId ?? null,
        scopeCountryCode: dto.scopeCountryCode ?? null,
        effectiveFrom: dto.effectiveFrom ?? null,
        effectiveTo: dto.effectiveTo ?? null,
        assignedBy: actorId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'user_role_assignment.create',
      entityType: 'user_role_assignment',
      entityId: row.id,
      changes: {
        userId: { old: null, new: row.userId },
        roleId: { old: null, new: row.roleId },
        scopeType: { old: null, new: row.scopeType },
      },
      correlationId,
      ipAddress,
    });

    return this.toListItem(await this.getAssignment(row.id, tenantId));
  }

  async updateAssignment(
    id: string,
    dto: UpdateUserRoleAssignmentDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<RoleAssignmentListItem> {
    const row = await this.getAssignment(id, tenantId);
    const before = {
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      scopeCountryCode: row.scopeCountryCode,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    };

    if (dto.scopeType !== undefined) row.scopeType = dto.scopeType;
    if (dto.scopeId !== undefined) row.scopeId = dto.scopeId;
    if (dto.scopeCountryCode !== undefined) {
      row.scopeCountryCode = dto.scopeCountryCode;
    }
    if (dto.effectiveFrom !== undefined) row.effectiveFrom = dto.effectiveFrom;
    if (dto.effectiveTo !== undefined) row.effectiveTo = dto.effectiveTo;

    this.assertScope(row.scopeType, row.scopeId, row.scopeCountryCode);

    const saved = await this.assignmentRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'user_role_assignment.update',
      entityType: 'user_role_assignment',
      entityId: saved.id,
      changes: {
        scopeType: { old: before.scopeType, new: saved.scopeType },
        scopeId: { old: before.scopeId, new: saved.scopeId },
        scopeCountryCode: {
          old: before.scopeCountryCode,
          new: saved.scopeCountryCode,
        },
        effectiveFrom: { old: before.effectiveFrom, new: saved.effectiveFrom },
        effectiveTo: { old: before.effectiveTo, new: saved.effectiveTo },
      },
      correlationId,
      ipAddress,
    });

    return this.toListItem(await this.getAssignment(saved.id, tenantId));
  }

  async revokeAssignment(
    id: string,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<RoleAssignmentListItem> {
    const row = await this.getAssignment(id, tenantId);
    const today = new Date().toISOString().slice(0, 10);
    if (row.effectiveTo && row.effectiveTo <= today) {
      return this.toListItem(row);
    }

    const before = row.effectiveTo;
    row.effectiveTo = today;
    const saved = await this.assignmentRepository.save(row);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'user_role_assignment.revoke',
      entityType: 'user_role_assignment',
      entityId: saved.id,
      changes: {
        effectiveTo: { old: before, new: saved.effectiveTo },
      },
      correlationId,
      ipAddress,
    });

    return this.toListItem(await this.getAssignment(saved.id, tenantId));
  }

  private assertScope(
    scopeType: ScopeType,
    scopeId?: string | null,
    scopeCountryCode?: string | null,
  ): void {
    if (
      (scopeType === ScopeType.DIVISION || scopeType === ScopeType.LEGAL_ENTITY)
      && !scopeId
    ) {
      throw new BadRequestException({
        code: 'SCOPE_ID_REQUIRED',
        message: 'scopeId is required for division and legal_entity scopes',
      });
    }
    if (scopeType === ScopeType.COUNTRY && !scopeCountryCode) {
      throw new BadRequestException({
        code: 'SCOPE_COUNTRY_REQUIRED',
        message: 'scopeCountryCode is required for country scope',
      });
    }
  }

  private toListItem(row: UserRoleAssignmentEntity): RoleAssignmentListItem {
    const user = row.user;
    const name = user
      ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
        || user.email
      : null;
    return {
      ...row,
      userEmail: user?.email ?? null,
      userName: name,
      roleCode: row.role?.code ?? null,
      roleName: row.role?.name ?? null,
    };
  }
}
