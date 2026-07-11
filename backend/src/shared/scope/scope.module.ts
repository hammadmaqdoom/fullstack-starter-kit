import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RowScopeService } from './row-scope.service';
import { ScopeContextFactory } from './scope-context.factory';

@Module({
  imports: [ComplianceModule, TypeOrmModule.forFeature([WorkerEntity])],
  providers: [RowScopeService, ScopeContextFactory],
  exports: [RowScopeService, ScopeContextFactory],
})
export class ScopeModule {}
