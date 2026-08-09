import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { AuditLogChanges, AuditLogEntity } from './entities/audit-log.entity';

export interface AppendAuditLogInput {
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: AuditLogChanges;
  correlationId?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async append(input: AppendAuditLogInput): Promise<AuditLogEntity> {
    const entry = this.auditLogRepository.create({
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changes: input.changes,
      correlationId: input.correlationId ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    return this.auditLogRepository.save(entry);
  }

  /**
   * 3.3 Server-side pagination + search on `GET /api/v1/audit-log`
   * (enterprise-readiness.md §3.3). Access is enforced by the controller
   * (People Ops / Super Admin only) — this method assumes the caller is
   * already authorized to see the tenant-wide audit trail.
   */
  async list(
    query: Partial<QueryAuditLogDto>,
    tenantId: string,
  ): Promise<PaginatedServiceResult<AuditLogEntity>> {
    const qb = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.tenantId = :tenantId', { tenantId });

    if (query.entityType) {
      qb.andWhere('auditLog.entityType = :entityType', {
        entityType: query.entityType,
      });
    }
    if (query.entityId) {
      qb.andWhere('auditLog.entityId = :entityId', {
        entityId: query.entityId,
      });
    }
    if (query.actorId) {
      qb.andWhere('auditLog.actorId = :actorId', { actorId: query.actorId });
    }
    if (query.action) {
      qb.andWhere('auditLog.action = :action', { action: query.action });
    }
    if (query.dateFrom) {
      qb.andWhere('auditLog.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere('auditLog.createdAt <= :dateTo', { dateTo: query.dateTo });
    }
    if (query.q?.trim()) {
      qb.andWhere(
        '(auditLog.entityType ILIKE :q OR auditLog.action ILIKE :q)',
        { q: `%${query.q.trim()}%` },
      );
    }

    qb.orderBy('auditLog.createdAt', 'DESC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
