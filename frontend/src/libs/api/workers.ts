import { apiRequest } from '@/libs/api/client';

export type WorkerStatus
  = | 'draft'
    | 'active'
    | 'on_leave'
    | 'separated'
    | 'archived';

export type WorkMode = 'remote' | 'hybrid' | 'in_office';

export type BillingModel = 'day_rate' | 'hourly' | 'fixed_fee' | 'retainer';

export type CompensationBand = {
  currency: string;
  baseSalary: number;
  payFrequency: 'monthly' | 'weekly';
};

export type ContractorProfile = {
  billingModel: BillingModel;
  contractStart?: string | null;
  contractEnd?: string | null;
  paymentTermsDays?: number | null;
  paymentCurrency?: string | null;
  agencyName?: string | null;
};

export type Worker = {
  id: string;
  employmentTypeId: string;
  countryCode: string;
  bankCountryCode: string;
  divisionId: string | null;
  departmentId: string | null;
  legalEntityId: string | null;
  managerId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  workMode: WorkMode | null;
  status: WorkerStatus;
  employeeNumber: string | null;
  startDate: string;
  endDate: string | null;
  dateOfBirth?: string | null;
  fteFraction: string;
  timezone: string | null;
  statutoryFields: Record<string, string> | null;
  compensationBand: CompensationBand | null;
  contractorProfile?: ContractorProfile | null;
  employmentType?: {
    id: string;
    code: string;
    displayName: string;
    isFte: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type WorkerListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  status?: WorkerStatus;
  countryCode?: string;
  employmentTypeId?: string;
  divisionId?: string;
};

export type CreateWorkerInput = {
  employmentTypeId: string;
  countryCode: string;
  bankCountryCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  workMode?: WorkMode;
  startDate: string;
  dateOfBirth?: string;
  employeeNumber?: string;
  managerId?: string;
  divisionId?: string;
  departmentId?: string;
  legalEntityId?: string;
  fteFraction?: number;
  timezone?: string;
  statutoryFields: Record<string, string>;
  compensationBand?: CompensationBand;
  contractorProfile?: ContractorProfile;
};

export type UpdateWorkerInput = Partial<CreateWorkerInput>;

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const BASE = '/api/v1/workers';

export async function listWorkers(query: WorkerListQuery = {}) {
  return apiRequest<Worker[]>(BASE, { params: query as Record<string, string | number> });
}

export async function getWorker(id: string) {
  return apiRequest<Worker>(`${BASE}/${id}`);
}

/** Worker profile linked to the current session (Me/Profile screen). */
export async function getMyWorker() {
  return apiRequest<Worker>(`${BASE}/me`);
}

export async function createWorker(input: CreateWorkerInput) {
  return apiRequest<Worker>(BASE, { method: 'POST', body: input });
}

export async function updateWorker(id: string, input: UpdateWorkerInput) {
  return apiRequest<Worker>(`${BASE}/${id}`, { method: 'PATCH', body: input });
}
