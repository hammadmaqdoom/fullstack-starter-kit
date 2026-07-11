import { apiRequest } from '@/libs/api/client';

export type RequisitionStatus
  = | 'draft'
    | 'pending_division_head'
    | 'pending_people_ops'
    | 'open'
    | 'on_hold'
    | 'closed'
    | 'cancelled';

export type CandidateStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export type ScorecardRecommendation = 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';

export type JobRequisition = {
  id: string;
  title: string;
  divisionId: string | null;
  departmentId: string | null;
  employmentTypeId: string;
  countryCode: string;
  manpowerPositionId: string | null;
  hiringManagerWorkerId: string;
  headcount: number;
  filledCount: number;
  budgetBandMin: string | null;
  budgetBandMax: string | null;
  justification: string | null;
  status: RequisitionStatus;
  requestedByUserId: string;
  createdAt: string;
};

export type Candidate = {
  id: string;
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string | null;
  cvBlobUrl: string | null;
  status: CandidateStatus;
  notes: string | null;
  rejectedReason: string | null;
  createdAt: string;
};

export type InterviewScorecard = {
  id: string;
  candidateId: string;
  stage: string;
  interviewerWorkerId: string;
  criteria: { name: string; weight: number; score: number }[];
  overallScore: string | null;
  recommendation: ScorecardRecommendation | null;
  notes: string | null;
  interviewedAt: string | null;
  createdAt: string;
};

const BASE = '/api/v1/talent/recruitment';

export async function listRequisitions() {
  return apiRequest<JobRequisition[]>(`${BASE}/requisitions`);
}

export async function getRequisition(id: string) {
  return apiRequest<JobRequisition>(`${BASE}/requisitions/${id}`);
}

export async function createRequisition(input: {
  title: string;
  divisionId?: string;
  departmentId?: string;
  employmentTypeId: string;
  countryCode: string;
  manpowerPositionId?: string;
  hiringManagerWorkerId: string;
  headcount?: number;
  budgetBandMin?: string;
  budgetBandMax?: string;
  justification?: string;
}) {
  return apiRequest<JobRequisition>(`${BASE}/requisitions`, { method: 'POST', body: input });
}

export async function updateRequisition(
  id: string,
  input: { status?: RequisitionStatus; title?: string; headcount?: number; justification?: string },
) {
  return apiRequest<JobRequisition>(`${BASE}/requisitions/${id}`, { method: 'PATCH', body: input });
}

export async function listCandidates(query?: { requisitionId?: string; status?: CandidateStatus }) {
  return apiRequest<Candidate[]>(`${BASE}/candidates`, { params: query });
}

export async function createCandidate(input: {
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
  cvBlobUrl?: string;
  notes?: string;
}) {
  return apiRequest<Candidate>(`${BASE}/candidates`, { method: 'POST', body: input });
}

export async function updateCandidateStatus(
  id: string,
  input: { status: CandidateStatus; rejectedReason?: string },
) {
  return apiRequest<Candidate>(`${BASE}/candidates/${id}/status`, { method: 'PATCH', body: input });
}

export async function listScorecards(candidateId: string) {
  return apiRequest<InterviewScorecard[]>(`${BASE}/candidates/${candidateId}/scorecards`);
}

export async function createScorecard(
  candidateId: string,
  input: {
    stage: string;
    criteria: { name: string; weight: number; score: number }[];
    recommendation?: ScorecardRecommendation;
    notes?: string;
  },
) {
  return apiRequest<InterviewScorecard>(`${BASE}/candidates/${candidateId}/scorecards`, {
    method: 'POST',
    body: input,
  });
}
