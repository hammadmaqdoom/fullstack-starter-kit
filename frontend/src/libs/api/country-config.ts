import { apiRequest } from '@/libs/api/client';

export type CountryConfig = {
  id: string;
  countryCode: string;
  isActive: boolean;
  configJson: Record<string, unknown>;
};

export type EmploymentType = {
  id: string;
  code: string;
  displayName: string;
  isFte: boolean;
};

export type EmploymentTypeCountryConfig = {
  id: string;
  employmentTypeId: string;
  countryCode: string;
  leaveEnabled: boolean;
  checkInRequired: boolean;
  payrollRoute: string;
  performanceIncluded: boolean;
  configJson: Record<string, unknown>;
  employmentType?: EmploymentType;
};

const BASE = '/api/v1/config';

export async function listCountries() {
  return apiRequest<CountryConfig[]>(`${BASE}/countries`);
}

export async function listEmploymentTypes() {
  return apiRequest<EmploymentType[]>(`${BASE}/employment-types`);
}

export async function listEmploymentTypeCountryConfigs() {
  return apiRequest<EmploymentTypeCountryConfig[]>(
    `${BASE}/employment-type-country-configs`,
  );
}
