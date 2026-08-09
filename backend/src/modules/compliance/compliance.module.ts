import { UserEntity } from '@/auth/entities/user.entity';
import { ComplianceAlertEntity } from '@/modules/automation/entities/compliance-alert.entity';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessReviewController } from './access-review.controller';
import { AccessReviewService } from './access-review.service';
import { AccessReviewQuarterlyAdapter } from './adapters/access-review-quarterly.adapter';
import { AuditLogImmutableAdapter } from './adapters/audit-log-immutable.adapter';
import { ControlTestAdapterRegistry } from './adapters/control-test-adapter.registry';
import { DsarExportReadyAdapter } from './adapters/dsar-export-ready.adapter';
import { OffboardingEntraDisableAdapter } from './adapters/offboarding-entra-disable.adapter';
import { RbacAssignmentReviewableAdapter } from './adapters/rbac-assignment-reviewable.adapter';
import { TrainingAwarenessOverdueAdapter } from './adapters/training-awareness-overdue.adapter';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { ComplianceControlController } from './compliance-control.controller';
import { ComplianceControlSeedService } from './compliance-control-seed.service';
import { ComplianceControlService } from './compliance-control.service';
import { ComplianceEvidenceService } from './compliance-evidence.service';
import { DIGITARO_TENANT_ID } from './constants/tenant.constants';
import { ControlTestRunnerService } from './control-test-runner.service';
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
      ComplianceAlertEntity,
    ]),
    forwardRef(() => DocumentsModule),
  ],
  controllers: [
    AuditLogController,
    AccessReviewController,
    EvidenceController,
    ComplianceControlController,
  ],
  providers: [
    AuditLogService,
    RbacService,
    AccessReviewService,
    DsarExportService,
    ComplianceControlSeedService,
    AccessReviewQuarterlyAdapter,
    RbacAssignmentReviewableAdapter,
    OffboardingEntraDisableAdapter,
    TrainingAwarenessOverdueAdapter,
    DsarExportReadyAdapter,
    AuditLogImmutableAdapter,
    ControlTestAdapterRegistry,
    ControlTestRunnerService,
    ComplianceControlService,
    ComplianceEvidenceService,
  ],
  exports: [
    AuditLogService,
    RbacService,
    TypeOrmModule,
    ComplianceControlSeedService,
    ControlTestRunnerService,
  ],
})
export class ComplianceModule implements OnModuleInit {
  constructor(private readonly seedService: ComplianceControlSeedService) {}

  async onModuleInit(): Promise<void> {
    await this.seedService.ensureSeeded(DIGITARO_TENANT_ID);
  }
}
