import { PayrollRoute } from '../enums/country-config.enum';

export const SUPPORTED_COUNTRY_CODES = ['PK', 'AE', 'SG'] as const;

export const CURRENCY_SEED = [
  { code: 'PKR', name: 'Pakistani Rupee', decimalPlaces: 2, symbol: '₨' },
  { code: 'AED', name: 'UAE Dirham', decimalPlaces: 2, symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, symbol: 'S$' },
  { code: 'USD', name: 'US Dollar', decimalPlaces: 2, symbol: '$' },
] as const;

export const EMPLOYMENT_TYPE_SEED = [
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    code: 'FULL_TIME',
    displayName: 'Full-time employee',
    isFte: true,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    code: 'PART_TIME',
    displayName: 'Part-time employee',
    isFte: true,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000003',
    code: 'FIXED_TERM',
    displayName: 'Fixed-term employee',
    isFte: true,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000004',
    code: 'CONTRACTOR',
    displayName: 'Contractor',
    isFte: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000005',
    code: 'AGENCY',
    displayName: 'Agency / temp worker',
    isFte: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000006',
    code: 'INTERN',
    displayName: 'Intern',
    isFte: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000007',
    code: 'CONSULTANT',
    displayName: 'Consultant',
    isFte: false,
  },
] as const;

export const COUNTRY_CONFIG_SEED = [
  {
    countryCode: 'PK',
    configJson: { displayName: 'Pakistan', timezone: 'Asia/Karachi' },
  },
  {
    countryCode: 'AE',
    configJson: { displayName: 'United Arab Emirates', timezone: 'Asia/Dubai' },
  },
  {
    countryCode: 'SG',
    configJson: { displayName: 'Singapore', timezone: 'Asia/Singapore' },
  },
] as const;

export const COUNTRY_CURRENCY_SEED = [
  {
    countryCode: 'PK',
    defaultCurrency: 'PKR',
    allowedCurrencies: ['PKR', 'USD'],
  },
  {
    countryCode: 'AE',
    defaultCurrency: 'AED',
    allowedCurrencies: ['AED', 'USD'],
  },
  {
    countryCode: 'SG',
    defaultCurrency: 'SGD',
    allowedCurrencies: ['SGD', 'USD'],
  },
] as const;

type EmploymentTypeSeed = (typeof EMPLOYMENT_TYPE_SEED)[number];

function employeeDefaults(): Omit<
  EmploymentTypeMatrixDefaults,
  'employmentTypeCode'
> {
  return {
    leaveEnabled: true,
    checkInRequired: true,
    payrollRoute: PayrollRoute.EMPLOYEE_PAY_RUN,
    performanceIncluded: true,
  };
}

function contractorDefaults(): Omit<
  EmploymentTypeMatrixDefaults,
  'employmentTypeCode'
> {
  return {
    leaveEnabled: false,
    checkInRequired: false,
    payrollRoute: PayrollRoute.CONTRACTOR_INVOICE,
    performanceIncluded: false,
  };
}

interface EmploymentTypeMatrixDefaults {
  employmentTypeCode: string;
  leaveEnabled: boolean;
  checkInRequired: boolean;
  payrollRoute: PayrollRoute;
  performanceIncluded: boolean;
}

const MATRIX_BY_TYPE: Record<string, EmploymentTypeMatrixDefaults> = {
  FULL_TIME: { employmentTypeCode: 'FULL_TIME', ...employeeDefaults() },
  PART_TIME: {
    employmentTypeCode: 'PART_TIME',
    ...employeeDefaults(),
    checkInRequired: true,
  },
  FIXED_TERM: { employmentTypeCode: 'FIXED_TERM', ...employeeDefaults() },
  CONTRACTOR: { employmentTypeCode: 'CONTRACTOR', ...contractorDefaults() },
  CONSULTANT: { employmentTypeCode: 'CONSULTANT', ...contractorDefaults() },
  AGENCY: {
    employmentTypeCode: 'AGENCY',
    leaveEnabled: false,
    checkInRequired: false,
    payrollRoute: PayrollRoute.EXCLUDED,
    performanceIncluded: false,
  },
  INTERN: {
    employmentTypeCode: 'INTERN',
    leaveEnabled: false,
    checkInRequired: true,
    payrollRoute: PayrollRoute.EMPLOYEE_PAY_RUN,
    performanceIncluded: false,
  },
};

export function buildEmploymentTypeCountryMatrix(): Array<
  EmploymentTypeMatrixDefaults & { countryCode: string }
> {
  const rows: Array<EmploymentTypeMatrixDefaults & { countryCode: string }> =
    [];

  for (const countryCode of SUPPORTED_COUNTRY_CODES) {
    for (const type of EMPLOYMENT_TYPE_SEED) {
      const defaults = MATRIX_BY_TYPE[type.code];
      rows.push({ ...defaults, countryCode });
    }
  }

  return rows;
}

export type EmploymentTypeSeedItem = EmploymentTypeSeed;
