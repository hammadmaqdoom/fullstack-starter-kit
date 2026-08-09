import { apiRequest } from '@/libs/api/client';

export type ProfileChangeStatus = 'submitted' | 'approved' | 'rejected';

export type ProfileFieldChange = Record<string, { old: unknown; new: unknown }>;

export type ProfileChangeRequest = {
  id: string;
  tenantId: string;
  workerId: string;
  fieldChanges: ProfileFieldChange;
  status: ProfileChangeStatus;
  approverId: string | null;
  reason: string | null;
  createdAt: string;
};

export type SubmitProfileChangeInput = {
  fieldChanges: ProfileFieldChange;
};

const WORKER_BASE = '/api/v1/workers';
const REQUEST_BASE = '/api/v1/change-requests';

export async function listProfileChangeRequests(workerId: string) {
  return apiRequest<ProfileChangeRequest[]>(`${WORKER_BASE}/${workerId}/change-requests`);
}

export async function submitProfileChangeRequest(
  workerId: string,
  input: SubmitProfileChangeInput,
) {
  return apiRequest<ProfileChangeRequest>(`${WORKER_BASE}/${workerId}/change-requests`, {
    method: 'POST',
    body: input,
  });
}

export async function approveProfileChangeRequest(requestId: string) {
  return apiRequest<ProfileChangeRequest>(`${REQUEST_BASE}/${requestId}/approve`, {
    method: 'POST',
    body: {},
  });
}

export async function rejectProfileChangeRequest(requestId: string, reason: string) {
  return apiRequest<ProfileChangeRequest>(`${REQUEST_BASE}/${requestId}/reject`, {
    method: 'POST',
    body: { reason },
  });
}
