import { apiRequest } from '@/libs/api/client';

export type WorkerRef = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

export type ManagerRelationship = {
  id: string;
  workerId: string;
  managerId: string;
  relationshipType: 'direct' | 'dotted_line';
  effectiveFrom: string;
  effectiveTo: string | null;
  worker?: WorkerRef;
  manager?: WorkerRef;
};

export type ProjectAssignment = {
  id: string;
  workerId: string;
  projectName: string;
  projectCode: string | null;
  projectLeadId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  worker?: WorkerRef;
  projectLead?: WorkerRef | null;
};

export type ApprovalDelegation = {
  id: string;
  delegatorWorkerId: string;
  delegateWorkerId: string;
  scope: 'approvals' | 'all';
  effectiveFrom: string;
  effectiveTo: string;
  reason: string | null;
  delegatorWorker?: WorkerRef;
  delegateWorker?: WorkerRef;
};

export type ApprovalRoutingConfig = {
  id: string;
  workflowType: 'leave' | 'expense' | 'travel';
  countryCode: string | null;
  legalEntityId: string | null;
  amountThreshold: string | null;
  approverMode: 'serial' | 'parallel';
  escalationAfterDays: number | null;
  isActive: boolean;
};

const ORG = '/api/v1/org';

export async function listManagerRelationships(workerId?: string) {
  return apiRequest<ManagerRelationship[]>(`${ORG}/manager-relationships`, {
    params: { workerId },
  });
}

export async function createManagerRelationship(body: {
  workerId: string;
  managerId: string;
  relationshipType?: 'direct' | 'dotted_line';
  effectiveFrom: string;
  effectiveTo?: string;
}) {
  return apiRequest<ManagerRelationship>(`${ORG}/manager-relationships`, {
    method: 'POST',
    body,
  });
}

export async function deleteManagerRelationship(id: string) {
  return apiRequest<null>(`${ORG}/manager-relationships/${id}`, {
    method: 'DELETE',
  });
}

export async function listProjectAssignments(workerId?: string) {
  return apiRequest<ProjectAssignment[]>(`${ORG}/project-assignments`, {
    params: { workerId, limit: 100 },
  });
}

export async function createProjectAssignment(body: {
  workerId: string;
  projectName: string;
  projectCode?: string;
  projectLeadId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
}) {
  return apiRequest<ProjectAssignment>(`${ORG}/project-assignments`, {
    method: 'POST',
    body,
  });
}

export async function deleteProjectAssignment(id: string) {
  return apiRequest<null>(`${ORG}/project-assignments/${id}`, {
    method: 'DELETE',
  });
}

export async function listApprovalDelegations(delegatorWorkerId?: string) {
  return apiRequest<ApprovalDelegation[]>(`${ORG}/approval-delegations`, {
    params: { delegatorWorkerId },
  });
}

export async function createApprovalDelegation(body: {
  delegatorWorkerId: string;
  delegateWorkerId: string;
  scope?: 'approvals' | 'all';
  effectiveFrom: string;
  effectiveTo: string;
  reason?: string;
}) {
  return apiRequest<ApprovalDelegation>(`${ORG}/approval-delegations`, {
    method: 'POST',
    body,
  });
}

export async function deleteApprovalDelegation(id: string) {
  return apiRequest<null>(`${ORG}/approval-delegations/${id}`, {
    method: 'DELETE',
  });
}

export async function listApprovalRoutingConfigs(workflowType?: string) {
  return apiRequest<ApprovalRoutingConfig[]>(`${ORG}/approval-routing-configs`, {
    params: { workflowType },
  });
}

export async function createApprovalRoutingConfig(body: {
  workflowType: 'leave' | 'expense' | 'travel';
  countryCode?: string;
  legalEntityId?: string;
  amountThreshold?: number;
  approverMode: 'serial' | 'parallel';
  escalationAfterDays?: number;
  isActive?: boolean;
}) {
  return apiRequest<ApprovalRoutingConfig>(`${ORG}/approval-routing-configs`, {
    method: 'POST',
    body,
  });
}

export async function deleteApprovalRoutingConfig(id: string) {
  return apiRequest<null>(`${ORG}/approval-routing-configs/${id}`, {
    method: 'DELETE',
  });
}
