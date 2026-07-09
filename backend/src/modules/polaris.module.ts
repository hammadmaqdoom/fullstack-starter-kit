import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { ScopeModule } from '@/shared/scope/scope.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [ComplianceModule, ScopeModule, CountryConfigModule, CoreHrModule],
  exports: [ComplianceModule, ScopeModule, CountryConfigModule, CoreHrModule],
})
export class PolarisModule {}
