import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { RoleEntity } from './entities/role.entity';
import { TenantEntity } from './entities/tenant.entity';
import { UserRoleAssignmentEntity } from './entities/user-role-assignment.entity';
import { RbacService } from './rbac.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      AuditLogEntity,
      RoleEntity,
      UserRoleAssignmentEntity,
    ]),
  ],
  providers: [AuditLogService, RbacService],
  exports: [AuditLogService, RbacService, TypeOrmModule],
})
export class ComplianceModule {}
