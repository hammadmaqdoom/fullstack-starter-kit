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

export type LegalEntityDivisionMapping = {
  id: string;
  legalEntityId: string;
  divisionId: string | null;
  countryCode: string;
  isDefault: boolean;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type LegalEntityCurrency = {
  id: string;
  legalEntityId: string;
  currencyCode: string;
  isDefault: boolean;
  isActive: boolean;
};

export type LegalEntitySignatory = {
  id: string;
  legalEntityId: string;
  workerId: string | null;
  name: string;
  title: string;
  email: string | null;
  isDefault: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export async function listLegalEntityMappings(legalEntityId: string) {
  return apiRequest<LegalEntityDivisionMapping[]>(
    `${BASE}/legal-entities/${legalEntityId}/division-mappings`,
  );
}

export async function createLegalEntityMapping(
  legalEntityId: string,
  body: {
    divisionId?: string | null;
    countryCode: string;
    isDefault?: boolean;
    priority?: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
  },
) {
  return apiRequest<LegalEntityDivisionMapping>(
    `${BASE}/legal-entities/${legalEntityId}/division-mappings`,
    { method: 'POST', body },
  );
}

export async function listLegalEntityCurrencies(legalEntityId: string) {
  return apiRequest<LegalEntityCurrency[]>(
    `${BASE}/legal-entities/${legalEntityId}/currencies`,
  );
}

export async function createLegalEntityCurrency(
  legalEntityId: string,
  body: { currencyCode: string; isDefault?: boolean; isActive?: boolean },
) {
  return apiRequest<LegalEntityCurrency>(
    `${BASE}/legal-entities/${legalEntityId}/currencies`,
    { method: 'POST', body },
  );
}

export async function updateLegalEntityCurrency(
  legalEntityId: string,
  currencyId: string,
  body: { isDefault?: boolean; isActive?: boolean },
) {
  return apiRequest<LegalEntityCurrency>(
    `${BASE}/legal-entities/${legalEntityId}/currencies/${currencyId}`,
    { method: 'PATCH', body },
  );
}

export async function listLegalEntitySignatories(legalEntityId: string) {
  return apiRequest<LegalEntitySignatory[]>(
    `${BASE}/legal-entities/${legalEntityId}/signatories`,
  );
}

export async function createLegalEntitySignatory(
  legalEntityId: string,
  body: {
    workerId?: string | null;
    name: string;
    title: string;
    email?: string | null;
    isDefault?: boolean;
    effectiveFrom: string;
    effectiveTo?: string | null;
  },
) {
  return apiRequest<LegalEntitySignatory>(
    `${BASE}/legal-entities/${legalEntityId}/signatories`,
    { method: 'POST', body },
  );
}

export async function updateLegalEntitySignatory(
  legalEntityId: string,
  signatoryId: string,
  body: {
    name?: string;
    title?: string;
    email?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    effectiveTo?: string | null;
  },
) {
  return apiRequest<LegalEntitySignatory>(
    `${BASE}/legal-entities/${legalEntityId}/signatories/${signatoryId}`,
    { method: 'PATCH', body },
  );
}
