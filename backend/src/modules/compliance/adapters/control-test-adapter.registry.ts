import { PolicyService } from '@/modules/documents/policy.service';
import { Injectable } from '@nestjs/common';
import { AccessReviewQuarterlyAdapter } from './access-review-quarterly.adapter';
import { AuditLogImmutableAdapter } from './audit-log-immutable.adapter';
import { ControlTestAdapter } from './control-test-adapter.types';
import { DsarExportReadyAdapter } from './dsar-export-ready.adapter';
import { OffboardingEntraDisableAdapter } from './offboarding-entra-disable.adapter';
import { PolicyAckCurrentAdapter } from './policy-ack-current.adapter';
import { RbacAssignmentReviewableAdapter } from './rbac-assignment-reviewable.adapter';
import { TrainingAwarenessOverdueAdapter } from './training-awareness-overdue.adapter';

@Injectable()
export class ControlTestAdapterRegistry {
  private readonly byKey: Map<string, ControlTestAdapter>;

  constructor(
    policyService: PolicyService,
    accessReviewQuarterly: AccessReviewQuarterlyAdapter,
    rbacAssignmentReviewable: RbacAssignmentReviewableAdapter,
    offboardingEntraDisable: OffboardingEntraDisableAdapter,
    trainingAwarenessOverdue: TrainingAwarenessOverdueAdapter,
    dsarExportReady: DsarExportReadyAdapter,
    auditLogImmutable: AuditLogImmutableAdapter,
  ) {
    const policyAck = new PolicyAckCurrentAdapter(policyService);
    const adapters: ControlTestAdapter[] = [
      policyAck,
      accessReviewQuarterly,
      rbacAssignmentReviewable,
      offboardingEntraDisable,
      trainingAwarenessOverdue,
      dsarExportReady,
      auditLogImmutable,
    ];
    this.byKey = new Map(adapters.map((a) => [a.key, a]));
  }

  get(key: string): ControlTestAdapter | undefined {
    return this.byKey.get(key);
  }
}
