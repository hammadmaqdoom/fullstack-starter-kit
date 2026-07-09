import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { Module } from '@nestjs/common';
import { RowScopeService } from './row-scope.service';

@Module({
  imports: [ComplianceModule],
  providers: [RowScopeService],
  exports: [RowScopeService],
})
export class ScopeModule {}
