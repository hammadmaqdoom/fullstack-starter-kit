import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDirectoryDto } from './dto/query-directory.dto';
import { QueryOrgChartDto } from './dto/query-org-chart.dto';
import { WorkerEntity } from './entities/worker.entity';
import { WorkerStatus } from './enums/worker.enum';
import {
  buildOrgChartSubtree,
  DirectoryEntry,
  OrgChartNode,
  toDirectoryEntry,
} from './org.mapper';
import {
  applyWorkerScopeFilter,
  resolveActingWorkerId,
} from './worker-scope.util';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly rbacService: RbacService,
  ) {}

  async getOrgChart(
    query: QueryOrgChartDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<OrgChartNode[]> {
    const workers = await this.loadScopedWorkers(actorId, tenantId);
    const maxDepth = query.depth ?? 2;

    if (query.rootId) {
      const inScope = workers.some((worker) => worker.id === query.rootId);
      if (!inScope) {
        throw new NotFoundException({
          code: 'ORG_CHART_ROOT_NOT_FOUND',
          message: 'Root worker not found in scope',
        });
      }
    }

    return buildOrgChartSubtree(workers, maxDepth, query.rootId);
  }

  async getDirectory(
    query: QueryDirectoryDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<DirectoryEntry>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const qb = this.workerRepository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.employmentType', 'employmentType')
      .leftJoinAndSelect('worker.division', 'division')
      .leftJoinAndSelect('worker.department', 'department')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.deletedAt IS NULL')
      .andWhere('worker.status IN (:...statuses)', {
        statuses: [WorkerStatus.ACTIVE, WorkerStatus.ON_LEAVE],
      });

    if (query.divisionId) {
      qb.andWhere('worker.divisionId = :divisionId', {
        divisionId: query.divisionId,
      });
    }
    if (query.departmentId) {
      qb.andWhere('worker.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.countryCode) {
      qb.andWhere('worker.countryCode = :countryCode', {
        countryCode: query.countryCode,
      });
    }
    if (query.q) {
      qb.andWhere(
        '(worker.firstName ILIKE :q OR worker.lastName ILIKE :q OR worker.email ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    applyWorkerScopeFilter(qb, auth, actingWorkerId);
    qb.orderBy('worker.lastName', 'ASC').addOrderBy('worker.firstName', 'ASC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const total = await qb.getCount();
    const workers = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: workers.map((worker) =>
        toDirectoryEntry(worker, auth, actingWorkerId),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async loadScopedWorkers(
    actorId: string,
    tenantId: string,
  ): Promise<WorkerEntity[]> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const qb = this.workerRepository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.employmentType', 'employmentType')
      .leftJoinAndSelect('worker.division', 'division')
      .leftJoinAndSelect('worker.department', 'department')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.deletedAt IS NULL')
      .andWhere('worker.status IN (:...statuses)', {
        statuses: [WorkerStatus.ACTIVE, WorkerStatus.ON_LEAVE, WorkerStatus.DRAFT],
      });

    applyWorkerScopeFilter(qb, auth, actingWorkerId);
    return qb.getMany();
  }
}
