import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { OperationsModule } from '@/modules/operations/operations.module';
import { Module } from '@nestjs/common';
import { ShellController } from './shell.controller';
import { ShellSearchService } from './shell-search.service';
import { ShellService } from './shell.service';

@Module({
  imports: [
    ComplianceModule,
    CountryConfigModule,
    CoreHrModule,
    OperationsModule,
    DocumentsModule,
  ],
  controllers: [ShellController],
  providers: [ShellService, ShellSearchService],
  exports: [ShellService, ShellSearchService],
})
export class ShellModule {}
