import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { CountryConfigController } from './country-config.controller';
import { CountryConfigService } from './country-config.service';
import { BenefitTypeEntity } from './entities/benefit-type.entity';
import { CountryConfigEntity } from './entities/country-config.entity';
import { CountryCurrencyConfigEntity } from './entities/country-currency-config.entity';
import { CurrencyCodeEntity } from './entities/currency-code.entity';
import { DocumentTemplateEntity } from './entities/document-template.entity';
import { DocumentTemplateVersionEntity } from './entities/document-template-version.entity';
import { EmploymentTypeCountryConfigEntity } from './entities/employment-type-country-config.entity';
import { EmploymentTypeEntity } from './entities/employment-type.entity';
import {
  ExchangeRateEntity,
  ExchangeRateFetchBatchEntity,
} from './entities/exchange-rate.entity';
import { FxVarianceAlertConfigEntity } from './entities/fx-variance-alert-config.entity';
import { HolidayCalendarEntity } from './entities/holiday-calendar.entity';
import { HolidayEntity } from './entities/holiday.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';
import { SetupWizardProgressEntity } from './entities/setup-wizard-progress.entity';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';
import { SetupWizardController } from './setup-wizard.controller';
import { SetupWizardService } from './setup-wizard.service';

@Module({
  imports: [
    ComplianceModule,
    TypeOrmModule.forFeature([
      CurrencyCodeEntity,
      CountryConfigEntity,
      EmploymentTypeEntity,
      EmploymentTypeCountryConfigEntity,
      CountryCurrencyConfigEntity,
      ExchangeRateEntity,
      ExchangeRateFetchBatchEntity,
      FxVarianceAlertConfigEntity,
      SetupWizardProgressEntity,
      LeaveTypeEntity,
      HolidayCalendarEntity,
      HolidayEntity,
      BenefitTypeEntity,
      DocumentTemplateEntity,
      DocumentTemplateVersionEntity,
      LegalEntityEntity,
    ]),
  ],
  controllers: [
    CountryConfigController,
    SetupWizardController,
    FxController,
  ],
  providers: [CountryConfigService, SetupWizardService, FxService],
  exports: [CountryConfigService, SetupWizardService, FxService, TypeOrmModule],
})
export class CountryConfigModule {}
