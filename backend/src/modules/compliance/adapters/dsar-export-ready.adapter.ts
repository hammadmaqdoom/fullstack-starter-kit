import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import {
  AdapterRunResult,
  ControlTestAdapter,
} from './control-test-adapter.types';

@Injectable()
export class DsarExportReadyAdapter implements ControlTestAdapter {
  readonly key = 'dsar_export_ready';

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async run(tenantId: string): Promise<AdapterRunResult> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 365);

    const recent = await this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.action = :action', { action: 'compliance.dsar.export' })
      .andWhere('log.createdAt >= :since', { since })
      .orderBy('log.createdAt', 'DESC')
      .getOne();

    if (!recent) {
      return {
        result: 'manual',
        summary: {
          reason:
            'No DSAR export in last 365 days — capability exists; attest runbook',
        },
        evidenceRefs: [
          {
            kind: 'path',
            path: '/api/v1/compliance/dsar/export',
            label: 'DSAR export API',
          },
        ],
      };
    }

    return {
      result: 'pass',
      summary: {
        lastExportAt: recent.createdAt.toISOString(),
        auditLogId: recent.id,
      },
      evidenceRefs: [{ kind: 'audit_log', id: recent.id }],
    };
  }
}
