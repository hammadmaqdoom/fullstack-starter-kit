import { AutomationModule } from '@/modules/automation/automation.module';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { EsignModule } from '@/modules/esign/esign.module';
import { OperationsModule } from '@/modules/operations/operations.module';
import { PayrollModule } from '@/modules/payroll/payroll.module';
import { ShellModule } from '@/modules/shell/shell.module';
import { TalentModule } from '@/modules/talent/talent.module';
import { TimeLeaveModule } from '@/modules/time-leave/time-leave.module';
import { ScopeModule } from '@/shared/scope/scope.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ComplianceModule,
    ScopeModule,
    CountryConfigModule,
    CoreHrModule,
    TalentModule,
    TimeLeaveModule,
    AutomationModule,
    DocumentsModule,
    OperationsModule,
    EsignModule,
    PayrollModule,
    ShellModule,
  ],
  exports: [
    ComplianceModule,
    ScopeModule,
    CountryConfigModule,
    CoreHrModule,
    TalentModule,
    TimeLeaveModule,
    AutomationModule,
    DocumentsModule,
    OperationsModule,
    EsignModule,
    PayrollModule,
    ShellModule,
  ],
})
export class PolarisModule {}