import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
