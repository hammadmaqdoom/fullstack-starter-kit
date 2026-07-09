import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DIGITARO_TENANT_ID } from './constants/tenant.constants';
import { UserRoleAssignmentEntity } from './entities/user-role-assignment.entity';
import {
  PolarisAuthContext,
  RoleAssignmentContext,
} from './types/rbac.type';
import { ScopeType, SCOPE_BREADTH } from './enums/scope-type.enum';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(UserRoleAssignmentEntity)
    private readonly assignmentRepository: Repository<UserRoleAssignmentEntity>,
  ) {}

  async getAuthContext(
    userId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PolarisAuthContext> {
    const today = new Date().toISOString().slice(0, 10);
    const assignments = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.role', 'role')
      .where('assignment.tenantId = :tenantId', { tenantId })
      .andWhere('assignment.userId = :userId', { userId })
      .andWhere(
        '(assignment.effectiveFrom IS NULL OR assignment.effectiveFrom <= :today)',
        { today },
      )
      .andWhere(
        '(assignment.effectiveTo IS NULL OR assignment.effectiveTo > :today)',
        { today },
      )
      .getMany();

    const mapped = assignments
      .filter((assignment) => assignment.role)
      .map((assignment) => this.toAssignmentContext(assignment));

    return {
      tenantId,
      userId,
      roleCodes: mapped.map((assignment) => assignment.roleCode),
      assignments: mapped,
      broadestScope: this.getBroadestScope(mapped),
    };
  }

  async hasAnyRole(
    userId: string,
    requiredRoles: string[],
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<boolean> {
    if (requiredRoles.length === 0) {
      return true;
    }

    const context = await this.getAuthContext(userId, tenantId);
    const normalizedRequired = requiredRoles.map((role) => role.toLowerCase());

    return context.roleCodes.some((roleCode) =>
      normalizedRequired.includes(roleCode.toLowerCase()),
    );
  }

  getBroadestScope(assignments: RoleAssignmentContext[]): ScopeType {
    if (assignments.length === 0) {
      return ScopeType.OWN;
    }

    return assignments.reduce<ScopeType>((broadest, assignment) => {
      return SCOPE_BREADTH[assignment.scopeType] > SCOPE_BREADTH[broadest]
        ? assignment.scopeType
        : broadest;
    }, ScopeType.OWN);
  }

  private toAssignmentContext(
    assignment: UserRoleAssignmentEntity,
  ): RoleAssignmentContext {
    return {
      roleId: assignment.roleId,
      roleCode: assignment.role!.code,
      scopeType: assignment.scopeType,
      scopeId: assignment.scopeId,
    };
  }
}
