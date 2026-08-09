import { UserEntity } from '@/auth/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessReviewController } from './access-review.controller';
import { AccessReviewService } from './access-review.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { DsarExportService } from './dsar-export.service';
import { AccessReviewCycleEntity } from './entities/access-review-cycle.entity';
import { AccessReviewItemEntity } from './entities/access-review-item.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { ComplianceControlEntity } from './entities/compliance-control.entity';
import { ComplianceProgrammeEntity } from './entities/compliance-programme.entity';
import { ControlEvidenceLinkEntity } from './entities/control-evidence-link.entity';
import { ControlFrameworkMapEntity } from './entities/control-framework-map.entity';
import { ControlTestRunEntity } from './entities/control-test-run.entity';
import { RoleEntity } from './entities/role.entity';
import { TenantEntity } from './entities/tenant.entity';
import { UserRoleAssignmentEntity } from './entities/user-role-assignment.entity';
import { EvidenceController } from './evidence.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      AuditLogEntity,
      RoleEntity,
      UserRoleAssignmentEntity,
      UserEntity,
      AccessReviewCycleEntity,
      AccessReviewItemEntity,
      ComplianceProgrammeEntity,
      ComplianceControlEntity,
      ControlFrameworkMapEntity,
      ControlTestRunEntity,
      ControlEvidenceLinkEntity,
    ]),
  ],
  controllers: [AuditLogController, AccessReviewController, EvidenceController],
  providers: [
    AuditLogService,
    RbacService,
    AccessReviewService,
    DsarExportService,
  ],
  exports: [AuditLogService, RbacService, TypeOrmModule],
})
export class ComplianceModule {}
