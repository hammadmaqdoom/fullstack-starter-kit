import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { ScopeModule } from '@/shared/scope/scope.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractorProfileEntity } from './entities/contractor-profile.entity';
import { DepartmentEntity } from './entities/department.entity';
import { DivisionEntity } from './entities/division.entity';
import { LegalEntityEntity } from './entities/legal-entity.entity';
import { ManagerRelationshipEntity } from './entities/manager-relationship.entity';
import { ProfileChangeRequestEntity } from './entities/profile-change-request.entity';
import { WorkerEntity } from './entities/worker.entity';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { ProfileChangeRequestController } from './profile-change-request.controller';
import { ProfileChangeRequestService } from './profile-change-request.service';
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
      ManagerRelationshipEntity,
      ProfileChangeRequestEntity,
    ]),
    ComplianceModule,
    CountryConfigModule,
    ScopeModule,
  ],
  controllers: [
    WorkerController,
    OrgController,
    ProfileChangeRequestController,
  ],
  providers: [WorkerService, OrgService, ProfileChangeRequestService],
  exports: [WorkerService, OrgService, ProfileChangeRequestService, TypeOrmModule],
})
export class CoreHrModule {}
