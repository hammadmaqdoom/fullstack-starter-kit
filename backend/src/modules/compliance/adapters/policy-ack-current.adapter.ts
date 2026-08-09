import { Injectable } from '@nestjs/common';
import {
  AdapterRunResult,
  ControlTestAdapter,
} from './control-test-adapter.types';

export type PolicyComplianceRow = {
  pendingCount: number;
  policyCode: string;
  policyVersionId: string;
};

export type PolicyCompliancePort = {
  getComplianceDashboard(tenantId: string): Promise<PolicyComplianceRow[]>;
};

@Injectable()
export class PolicyAckCurrentAdapter implements ControlTestAdapter {
  readonly key = 'policy_ack_current';

  constructor(private readonly policyCompliance: PolicyCompliancePort) {}

  async run(tenantId: string): Promise<AdapterRunResult> {
    const rows = await this.policyCompliance.getComplianceDashboard(tenantId);
    const pendingCount = rows.reduce((sum, row) => sum + row.pendingCount, 0);
    const evidenceRefs = rows
      .filter((row) => row.pendingCount > 0)
      .slice(0, 20)
      .map((row) => ({
        kind: 'policy_version',
        id: row.policyVersionId,
        path: `/people-ops/policies`,
        label: row.policyCode,
      }));

    if (pendingCount === 0) {
      return {
        result: 'pass',
        summary: { pendingCount: 0, policyRows: rows.length },
        evidenceRefs: [
          {
            kind: 'path',
            path: '/people-ops/policies',
            label: 'Policy compliance dashboard',
          },
        ],
      };
    }

    return {
      result: 'fail',
      summary: { pendingCount, policyRows: rows.length },
      evidenceRefs,
    };
  }
}
