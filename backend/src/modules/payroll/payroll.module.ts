import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { BenefitTypeEntity } from '@/modules/country-config/entities/benefit-type.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BenefitTypeController,
  EmployeeBenefitController,
} from './benefit.controller';
import { BenefitService } from './benefit.service';
import { CompensationController } from './compensation.controller';
import { CompensationService } from './compensation.service';
import { BenefitTypeFieldEntity } from './entities/benefit-type-field.entity';
import { CompensationRecordEntity } from './entities/compensation-record.entity';
import { EmployeeBenefitEntity } from './entities/employee-benefit.entity';
import { PayComponentEntity } from './entities/pay-component.entity';
import { StatutoryRateEntryEntity } from './entities/statutory-rate-entry.entity';
import { StatutoryRateScheduleEntity } from './entities/statutory-rate-schedule.entity';
import { PayRunCalculatorService } from './pay-run-calculator.service';
import { PayrollSeedService } from './payroll-seed.service';
import { StatutoryRateController } from './statutory-rate.controller';
import { StatutoryRateService } from './statutory-rate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayComponentEntity,
      CompensationRecordEntity,
      BenefitTypeEntity,
      BenefitTypeFieldEntity,
      EmployeeBenefitEntity,
      StatutoryRateScheduleEntity,
      StatutoryRateEntryEntity,
      WorkerEntity,
    ]),
    ComplianceModule,
    CountryConfigModule,
    CoreHrModule,
  ],
  controllers: [
    BenefitTypeController,
    EmployeeBenefitController,
    CompensationController,
    StatutoryRateController,
  ],
  providers: [
    BenefitService,
    CompensationService,
    StatutoryRateService,
    PayRunCalculatorService,
    PayrollSeedService,
  ],
  exports: [
    BenefitService,
    CompensationService,
    StatutoryRateService,
    PayRunCalculatorService,
    PayrollSeedService,
    TypeOrmModule,
  ],
})
export class PayrollModule {}
