import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScopeContext } from './scope-context.type';

/**
 * Builds a `ScopeContext` (enterprise-readiness.md §3.1) from a resolved
 * `PolarisAuthContext` plus the acting worker's own org placement. Consumers
 * that only need a boolean access check should keep using
 * `RowScopeService.canAccess()` / `meetsMinimumScope()` — this factory is for
 * services that want a single object to filter repository queries with.
 */
@Injectable()
export class ScopeContextFactory {
  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
  ) {}

  async build(
    auth: PolarisAuthContext,
    actingWorkerId: string | null,
  ): Promise<ScopeContext> {
    const context: ScopeContext = { tenantId: auth.tenantId };

    if (auth.broadestScope === ScopeType.ALL) {
      return context;
    }

    const actingWorker = actingWorkerId
      ? await this.workerRepository.findOne({
          where: { id: actingWorkerId, tenantId: auth.tenantId },
          select: [
            'id',
            'legalEntityId',
            'departmentId',
            'countryCode',
            'divisionId',
          ],
        })
      : null;

    const divisionAssignment = auth.assignments.find(
      (assignment) =>
        assignment.scopeType === ScopeType.DIVISION && assignment.scopeId,
    );
    context.divisionId =
      divisionAssignment?.scopeId ?? actingWorker?.divisionId ?? undefined;
    context.legalEntityId = actingWorker?.legalEntityId ?? undefined;
    context.departmentId = actingWorker?.departmentId ?? undefined;
    context.countryCode = actingWorker?.countryCode ?? undefined;

    const hasTeamScope = auth.assignments.some(
      (assignment) => assignment.scopeType === ScopeType.TEAM,
    );
    if (hasTeamScope && actingWorkerId) {
      const reports = await this.workerRepository.find({
        where: { tenantId: auth.tenantId, managerId: actingWorkerId },
        select: ['id'],
      });
      context.teamWorkerIds = [
        actingWorkerId,
        ...reports.map((report) => report.id),
      ];
    }

    return context;
  }
}
