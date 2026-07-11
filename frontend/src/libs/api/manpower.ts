import { apiRequest } from '@/libs/api/client';

export type ManpowerPlanStatus = 'draft' | 'active' | 'closed';
export type ManpowerPositionStatus = 'open' | 'filled' | 'frozen';

export type ManpowerPlan = {
  id: string;
  name: string;
  divisionId: string | null;
  countryCode: string | null;
  planYear: number;
  budgetedFte: number;
  budgetedContractorCapacity: number;
  plannedAttritionPercent: string;
  status: ManpowerPlanStatus;
  createdAt: string;
};

export type ManpowerPosition = {
  id: string;
  planId: string;
  roleTitle: string;
  departmentId: string | null;
  employmentTypeId: string;
  headcount: number;
  filledCount: number;
  status: ManpowerPositionStatus;
  requisitionId: string | null;
  createdAt: string;
};

const BASE = '/api/v1/talent/manpower';

export async function listPlans() {
  return apiRequest<ManpowerPlan[]>(`${BASE}/plans`);
}

export async function createPlan(input: {
  name: string;
  divisionId?: string;
  countryCode?: string;
  planYear: number;
  budgetedFte?: number;
  budgetedContractorCapacity?: number;
  plannedAttritionPercent?: number;
}) {
  return apiRequest<ManpowerPlan>(`${BASE}/plans`, { method: 'POST', body: input });
}

export async function updatePlan(id: string, input: { status?: ManpowerPlanStatus; budgetedFte?: number }) {
  return apiRequest<ManpowerPlan>(`${BASE}/plans/${id}`, { method: 'PATCH', body: input });
}

export async function listPositions(planId: string) {
  return apiRequest<ManpowerPosition[]>(`${BASE}/plans/${planId}/positions`);
}

export async function createPosition(
  planId: string,
  input: { roleTitle: string; departmentId?: string; employmentTypeId: string; headcount?: number },
) {
  return apiRequest<ManpowerPosition>(`${BASE}/plans/${planId}/positions`, { method: 'POST', body: input });
}

export async function updatePosition(
  id: string,
  input: { status?: ManpowerPositionStatus; headcount?: number },
) {
  return apiRequest<ManpowerPosition>(`${BASE}/positions/${id}`, { method: 'PATCH', body: input });
}
