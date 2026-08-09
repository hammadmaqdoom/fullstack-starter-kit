import { apiRequest } from '@/libs/api/client';

const BASE = '/api/v1/compliance';

export type ControlLatestRun = {
  id: string;
  result: 'pass' | 'fail' | 'manual' | 'error' | 'skipped';
  ranAt: string;
  summary?: Record<string, unknown>;
};

export type ComplianceControlListItem = {
  id: string;
  code: string;
  title: string;
  domain: string;
  ownerRole: string;
  frequency: string;
  inScope: boolean;
  testAdapterKey: string | null;
  latestRun: ControlLatestRun | null;
  frameworks: { framework: string; externalRef: string }[];
};

export type ComplianceProgramme = {
  id: string;
  evidenceWindowStart: string | null;
  targetFrameworks: string[];
  nextAuditTargetDate: string | null;
  notes: string | null;
};

export async function listComplianceControls(params?: {
  domain?: string;
  result?: string;
  inScope?: string;
}) {
  return apiRequest<ComplianceControlListItem[]>(`${BASE}/controls`, {
    params,
  });
}

export async function getComplianceControl(code: string) {
  return apiRequest<
    ComplianceControlListItem & {
      description: string;
      frameworks: {
        framework: string;
        externalRef: string;
        notes?: string | null;
      }[];
      runs: ControlLatestRun[];
      evidenceLinks: {
        id: string;
        label: string;
        urlOrPath: string;
        collectedAt: string;
      }[];
    }
  >(`${BASE}/controls/${encodeURIComponent(code)}`);
}

export async function runComplianceControl(code: string) {
  return apiRequest<ControlLatestRun>(
    `${BASE}/controls/${encodeURIComponent(code)}/run`,
    { method: 'POST' },
  );
}

export async function getComplianceProgramme() {
  return apiRequest<ComplianceProgramme>(`${BASE}/programme`);
}

export async function updateComplianceProgramme(
  body: Partial<ComplianceProgramme>,
) {
  return apiRequest<ComplianceProgramme>(`${BASE}/programme`, {
    method: 'PATCH',
    body,
  });
}

export async function exportComplianceEvidence(framework?: string) {
  return apiRequest<{
    tenantId: string;
    exportedAt: string;
    framework: string | null;
    controls: unknown[];
  }>(`${BASE}/evidence/export`, {
    params: framework ? { framework } : undefined,
  });
}
