import { apiRequest } from '@/libs/api/client';

export type Division = {
  id: string;
  tenantId: string;
  name: string;
  headWorkerId: string | null;
  createdAt: string;
};

export type Department = {
  id: string;
  tenantId: string;
  name: string;
  divisionId: string | null;
  parentDepartmentId: string | null;
};

export type LegalEntity = {
  id: string;
  tenantId: string;
  code: string;
  registeredName: string;
  tradingName: string | null;
  countryCode: string;
  functionalCurrency: string;
  status: 'active' | 'inactive';
  effectiveFrom: string;
};

export type OfficeLocation = {
  id: string;
  tenantId: string;
  name: string;
  countryCode: string;
  address: string | null;
  latitude: string;
  longitude: string;
  geofenceRadiusM: number;
};

const BASE = '/api/v1/org';

export async function listDivisions() {
  return apiRequest<Division[]>(`${BASE}/divisions`);
}

export async function createDivision(body: { name: string }) {
  return apiRequest<Division>(`${BASE}/divisions`, { method: 'POST', body });
}

export async function listDepartments() {
  return apiRequest<Department[]>(`${BASE}/departments`);
}

export async function createDepartment(body: {
  name: string;
  divisionId?: string | null;
}) {
  return apiRequest<Department>(`${BASE}/departments`, { method: 'POST', body });
}

export async function listLegalEntities() {
  return apiRequest<LegalEntity[]>(`${BASE}/legal-entities`);
}

export async function createLegalEntity(body: {
  code: string;
  registeredName: string;
  countryCode: string;
  functionalCurrency: string;
  effectiveFrom: string;
}) {
  return apiRequest<LegalEntity>(`${BASE}/legal-entities`, {
    method: 'POST',
    body,
  });
}

export async function listOfficeLocations() {
  return apiRequest<OfficeLocation[]>(`${BASE}/office-locations`);
}

export async function createOfficeLocation(body: {
  name: string;
  countryCode: string;
  address?: string | null;
  latitude: string;
  longitude: string;
  geofenceRadiusM?: number;
}) {
  return apiRequest<OfficeLocation>(`${BASE}/office-locations`, {
    method: 'POST',
    body,
  });
}
