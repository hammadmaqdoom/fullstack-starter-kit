import { SUPPORTED_COUNTRY_CODES } from './country-config.seed-data';
import {
  BenefitDeliveryMode,
  DocumentAudience,
  DocumentType,
  LeaveAccrualMethod,
} from '../enums/setup-wizard.enum';

export const SETUP_WIZARD_SEED_YEAR = 2026;

export const DEFAULT_LEAVE_TYPES = [
  {
    countryCode: 'PK',
    code: 'ANNUAL',
    name: 'Annual leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '5',
  },
  {
    countryCode: 'PK',
    code: 'SICK',
    name: 'Sick leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '0',
  },
  {
    countryCode: 'PK',
    code: 'UNPAID',
    name: 'Unpaid leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '0',
  },
  {
    countryCode: 'AE',
    code: 'ANNUAL',
    name: 'Annual leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '5',
  },
  {
    countryCode: 'AE',
    code: 'SICK',
    name: 'Sick leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '0',
  },
  {
    countryCode: 'SG',
    code: 'ANNUAL',
    name: 'Annual leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '7',
  },
  {
    countryCode: 'SG',
    code: 'SICK',
    name: 'Outpatient sick leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '0',
  },
  {
    countryCode: 'SG',
    code: 'CHILDCARE',
    name: 'Childcare leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    carryForwardCap: '0',
  },
] as const;

type HolidaySeed = { name: string; holidayDate: string };

export const HOLIDAYS_BY_COUNTRY: Record<string, HolidaySeed[]> = {
  PK: [
    { name: 'Kashmir Day', holidayDate: '2026-02-05' },
    { name: 'Pakistan Day', holidayDate: '2026-03-23' },
    { name: 'Labour Day', holidayDate: '2026-05-01' },
    { name: 'Independence Day', holidayDate: '2026-08-14' },
    { name: 'Defence Day', holidayDate: '2026-09-06' },
    { name: 'Iqbal Day', holidayDate: '2026-11-09' },
    { name: 'Quaid-e-Azam Day', holidayDate: '2026-12-25' },
  ],
  AE: [
    { name: "New Year's Day", holidayDate: '2026-01-01' },
    { name: 'Eid Al Fitr (day 1)', holidayDate: '2026-03-20' },
    { name: 'Eid Al Fitr (day 2)', holidayDate: '2026-03-21' },
    { name: 'Arafat Day', holidayDate: '2026-05-26' },
    { name: 'Eid Al Adha (day 1)', holidayDate: '2026-05-27' },
    { name: 'Islamic New Year', holidayDate: '2026-06-16' },
    { name: 'National Day', holidayDate: '2026-12-02' },
    { name: 'National Day (observed)', holidayDate: '2026-12-03' },
  ],
  SG: [
    { name: "New Year's Day", holidayDate: '2026-01-01' },
    { name: 'Chinese New Year', holidayDate: '2026-02-17' },
    { name: 'Chinese New Year (day 2)', holidayDate: '2026-02-18' },
    { name: 'Good Friday', holidayDate: '2026-04-03' },
    { name: 'Labour Day', holidayDate: '2026-05-01' },
    { name: 'Hari Raya Puasa', holidayDate: '2026-05-28' },
    { name: 'National Day', holidayDate: '2026-08-09' },
    { name: 'Deepavali', holidayDate: '2026-11-08' },
    { name: 'Christmas Day', holidayDate: '2026-12-25' },
  ],
};

export const DEFAULT_BENEFIT_TYPES = [
  {
    code: 'HEALTH_INSURANCE',
    name: 'Health insurance',
    category: 'insurance',
    countryCode: null,
    deliveryMode: BenefitDeliveryMode.INSURANCE,
    affectsPayroll: false,
    affectsTax: false,
  },
  {
    code: 'TRANSPORT_ALLOWANCE',
    name: 'Transport allowance',
    category: 'allowance',
    countryCode: null,
    deliveryMode: BenefitDeliveryMode.CASH,
    affectsPayroll: true,
    affectsTax: true,
  },
  {
    code: 'MOBILE_ALLOWANCE',
    name: 'Mobile allowance',
    category: 'allowance',
    countryCode: null,
    deliveryMode: BenefitDeliveryMode.CASH,
    affectsPayroll: true,
    affectsTax: true,
  },
  {
    code: 'PK_EOBI',
    name: 'EOBI contribution',
    category: 'statutory',
    countryCode: 'PK',
    deliveryMode: BenefitDeliveryMode.NON_CASH,
    affectsPayroll: true,
    affectsTax: false,
  },
] as const;

export const DEFAULT_DOCUMENT_TEMPLATES = [
  {
    code: 'OFFER_LETTER_EMPLOYEE',
    documentType: DocumentType.OFFER_LETTER,
    audience: DocumentAudience.EMPLOYEE,
    countryCode: null,
    body: 'Dear {{worker.firstName}},\n\nWe are pleased to offer you the position of {{worker.jobTitle}} at Digitaro effective {{worker.startDate}}.\n\nRegards,\nPeople Operations',
    mergeFieldSchema: {
      'worker.firstName': { type: 'string' },
      'worker.jobTitle': { type: 'string' },
      'worker.startDate': { type: 'date' },
    },
  },
  {
    code: 'EMPLOYMENT_CONTRACT',
    documentType: DocumentType.CONTRACT,
    audience: DocumentAudience.EMPLOYEE,
    countryCode: null,
    body: 'Employment agreement between Digitaro and {{worker.fullName}}.\n\nStart date: {{worker.startDate}}\nCountry: {{worker.countryCode}}',
    mergeFieldSchema: {
      'worker.fullName': { type: 'string' },
      'worker.startDate': { type: 'date' },
      'worker.countryCode': { type: 'string' },
    },
  },
  {
    code: 'NDA_STANDARD',
    documentType: DocumentType.NDA,
    audience: DocumentAudience.SHARED,
    countryCode: null,
    body: 'Non-disclosure agreement for {{worker.fullName}}.\n\nEffective: {{document.effectiveDate}}',
    mergeFieldSchema: {
      'worker.fullName': { type: 'string' },
      'document.effectiveDate': { type: 'date' },
    },
  },
  {
    code: 'CONTRACTOR_SOW',
    documentType: DocumentType.SOW,
    audience: DocumentAudience.CONTRACTOR,
    countryCode: null,
    body: 'Statement of work for contractor {{worker.fullName}}.\n\nScope: {{sow.scope}}\nRate: {{sow.rate}}',
    mergeFieldSchema: {
      'worker.fullName': { type: 'string' },
      'sow.scope': { type: 'string' },
      'sow.rate': { type: 'string' },
    },
  },
] as const;

export const DEFAULT_NOTIFICATION_SETTINGS = {
  emailApprovals: true,
  emailPolicyReminders: true,
  pushActionRequired: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export const DEFAULT_CURRENCY_SETTINGS = {
  reportingCurrency: 'PKR',
  fxSource: 'frankfurter',
  enabledCurrencies: ['PKR', 'AED', 'SGD', 'USD'],
};

export const DEFAULT_COUNTRY_SELECTION = [...SUPPORTED_COUNTRY_CODES];
