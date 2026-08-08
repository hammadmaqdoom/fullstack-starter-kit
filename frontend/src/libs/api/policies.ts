import { apiRequest } from '@/libs/api/client';

export type PolicyCategory = 'hr' | 'security' | 'conduct' | 'it';

export type PendingPolicyAcknowledgement = {
  policyId: string;
  policyCode: string;
  policyTitle: string;
  category: PolicyCategory;
  policyVersionId: string;
  version: number;
  effectiveFrom: string;
  contentHtml: string | null;
  blobUrl?: string | null;
  contentSummary?: string | null;
  publishedAt?: string | null;
};

export type PolicyListItem = {
  id: string;
  code: string;
  title: string;
  category: PolicyCategory;
  isActive: boolean;
  currentVersion?: number | null;
  currentVersionId?: string | null;
  effectiveFrom?: string | null;
  acknowledgedCount?: number;
  pendingCount?: number;
  totalAssigned?: number;
  compliancePercent?: number;
};

export type PolicyAcknowledgementResult = {
  id: string;
  policyVersionId: string;
  workerId: string;
  acknowledgedAt: string;
};

export type ComplianceDashboardRow = {
  policyId: string;
  policyCode: string;
  policyTitle: string;
  policyVersionId: string;
  version: number;
  populationCount: number;
  acknowledgedCount: number;
  pendingCount: number;
};

const BASE = '/api/v1/policies';

export async function listPendingAcknowledgements() {
  return apiRequest<PendingPolicyAcknowledgement[]>(`${BASE}/pending-acknowledgements`);
}

export async function acknowledgePolicyVersion(versionId: string) {
  return apiRequest<PolicyAcknowledgementResult>(`${BASE}/${versionId}/acknowledge`, {
    method: 'POST',
    body: {},
  });
}

export async function listPolicies() {
  return apiRequest<PolicyListItem[]>(BASE);
}

export async function getComplianceDashboard() {
  return apiRequest<ComplianceDashboardRow[]>(`${BASE}/compliance-dashboard`);
}
