import { Queue as QueueEnum } from '@/constants/job.constant';
import { AutomationModule } from '@/modules/automation/automation.module';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { ScopeModule } from '@/shared/scope/scope.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalDelegationController } from './approval-delegation.controller';
import { ApprovalDelegationService } from './approval-delegation.service';
import { ApprovalRoutingConfigController } from './approval-routing-config.controller';
import { ApprovalRoutingConfigService } from './approval-routing-config.service';
import { ApprovalDelegationEntity } from './entities/approval-delegation.entity';
import { ApprovalRoutingConfigEntity } from './entities/approval-routing-config.entity';
import { ContractorProfileEntity } from './entities/contractor-profile.entity';
import { DepartmentEntity } from './entities/department.entity';
import { DivisionEntity } from './entities/division.entity';
import { LegalEntityEntity } from './entities/legal-entity.entity';
import { LegalEntityStatutoryIdEntity } from './entities/legal-entity-statutory-id.entity';
import {
  LegalEntityCurrencyEntity,
  LegalEntityDivisionMappingEntity,
} from './entities/legal-entity-division-mapping.entity';
import { LegalEntitySignatoryEntity } from './entities/legal-entity-signatory.entity';
import { ManagerRelationshipEntity } from './entities/manager-relationship.entity';
import { OfficeLocationEntity } from './entities/office-location.entity';
import { ProfileChangeRequestEntity } from './entities/profile-change-request.entity';
import { ProjectAssignmentEntity } from './entities/project-assignment.entity';
import { WorkerBankAccountEntity } from './entities/worker-bank-account.entity';
import { WorkerImportBatchEntity } from './entities/worker-import-batch.entity';
import { WorkerStatutoryIdEntity } from './entities/worker-statutory-id.entity';
import { EmployeeSkillEntity } from './entities/employee-skill.entity';
import { EmploymentRecordEntity } from './entities/employment-record.entity';
import { WorkerEntity } from './entities/worker.entity';
import { LeadershipAnalyticsController } from './leadership-analytics.controller';
import { LeadershipAnalyticsService } from './leadership-analytics.service';
import { ManagerRelationshipController } from './manager-relationship.controller';
import { ManagerRelationshipService } from './manager-relationship.service';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { ProfileChangeRequestController } from './profile-change-request.controller';
import { ProfileChangeRequestService } from './profile-change-request.service';
import { ProjectAssignmentController } from './project-assignment.controller';
import { ProjectAssignmentService } from './project-assignment.service';
import { WorkerImportController } from './worker-import.controller';
import { WorkerImportService } from './worker-import.service';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerEntity,
      ContractorProfileEntity,
      DivisionEntity,
      DepartmentEntity,
      LegalEntityEntity,
      LegalEntityStatutoryIdEntity,
      LegalEntityDivisionMappingEntity,
      LegalEntityCurrencyEntity,
      LegalEntitySignatoryEntity,
      OfficeLocationEntity,
      WorkerStatutoryIdEntity,
      WorkerBankAccountEntity,
      EmployeeSkillEntity,
      EmploymentRecordEntity,
      ManagerRelationshipEntity,
      ProfileChangeRequestEntity,
      ApprovalDelegationEntity,
      ProjectAssignmentEntity,
      ApprovalRoutingConfigEntity,
      WorkerImportBatchEntity,
    ]),
    BullModule.registerQueue({ name: QueueEnum.CoreHr }),
    ComplianceModule,
    CountryConfigModule,
    ScopeModule,
    AutomationModule,
  ],
  controllers: [
    WorkerController,
    OrgController,
    ProfileChangeRequestController,
    ApprovalDelegationController,
    ManagerRelationshipController,
    ProjectAssignmentController,
    ApprovalRoutingConfigController,
    WorkerImportController,
    LeadershipAnalyticsController,
  ],
  providers: [
    WorkerService,
    OrgService,
    ProfileChangeRequestService,
    ApprovalDelegationService,
    ManagerRelationshipService,
    ProjectAssignmentService,
    ApprovalRoutingConfigService,
    WorkerImportService,
    LeadershipAnalyticsService,
  ],
  exports: [
    WorkerService,
    OrgService,
    ProfileChangeRequestService,
    ApprovalDelegationService,
    ManagerRelationshipService,
    ProjectAssignmentService,
    ApprovalRoutingConfigService,
    WorkerImportService,
    LeadershipAnalyticsService,
    TypeOrmModule,
  ],
})
export class CoreHrModule {}
