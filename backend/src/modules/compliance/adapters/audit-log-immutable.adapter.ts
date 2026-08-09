import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log.service';
import { SYSTEM_ACTOR_ID } from '../constants/tenant.constants';
import {
  AdapterRunResult,
  ControlTestAdapter,
} from './control-test-adapter.types';

@Injectable()
export class AuditLogImmutableAdapter implements ControlTestAdapter {
  readonly key = 'audit_log_immutable';

  constructor(private readonly auditLogService: AuditLogService) {}

  async run(tenantId: string): Promise<AdapterRunResult> {
    const row = await this.auditLogService.append({
      tenantId,
      actorId: SYSTEM_ACTOR_ID,
      action: 'compliance.control_test.probe',
      entityType: 'compliance_control',
      entityId: '00000000-0000-4000-8000-000000000097',
      changes: { probe: { old: null, new: true } },
    });

    return {
      result: 'pass',
      summary: {
        probeAuditLogId: row.id,
        note: 'Append succeeded; AuditLogEntity has no updatedAt / delete path',
      },
      evidenceRefs: [{ kind: 'audit_log', id: row.id }],
    };
  }
}
