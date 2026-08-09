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
    daysPerYear: '20',
    carryForwardCap: '5',
  },
  {
    countryCode: 'PK',
    code: 'SICK',
    name: 'Sick leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    daysPerYear: '10',
    carryForwardCap: '0',
  },
  {
    countryCode: 'PK',
    code: 'UNPAID',
    name: 'Unpaid leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    daysPerYear: '0',
    carryForwardCap: '0',
  },
  {
    countryCode: 'AE',
    code: 'ANNUAL',
    name: 'Annual leave',
    accrualMethod: LeaveAccrualMethod.MONTHLY,
    daysPerYear: '30',
    carryForwardCap: '5',
  },
  {
    countryCode: 'AE',
    code: 'SICK',
    name: 'Sick leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    daysPerYear: '15',
    carryForwardCap: '0',
  },
  {
    countryCode: 'SG',
    code: 'ANNUAL',
    name: 'Annual leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    daysPerYear: '14',
    carryForwardCap: '7',
  },
  {
    countryCode: 'SG',
    code: 'SICK',
    name: 'Outpatient sick leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    daysPerYear: '14',
    carryForwardCap: '0',
  },
  {
    countryCode: 'SG',
    code: 'CHILDCARE',
    name: 'Childcare leave',
    accrualMethod: LeaveAccrualMethod.ANNUAL,
    daysPerYear: '6',
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
  {
    code: 'AE_EOSB',
    name: 'End-of-service gratuity',
    category: 'statutory',
    countryCode: 'AE',
    deliveryMode: BenefitDeliveryMode.NON_CASH,
    affectsPayroll: true,
    affectsTax: false,
  },
  {
    code: 'LIFE_INSURANCE',
    name: 'Life insurance',
    category: 'insurance',
    countryCode: null,
    deliveryMode: BenefitDeliveryMode.INSURANCE,
    affectsPayroll: false,
    affectsTax: false,
  },
  {
    code: 'DENTAL_INSURANCE',
    name: 'Dental insurance',
    category: 'insurance',
    countryCode: null,
    deliveryMode: BenefitDeliveryMode.INSURANCE,
    affectsPayroll: false,
    affectsTax: false,
  },
  {
    code: 'WELLNESS_ALLOWANCE',
    name: 'Wellness / gym allowance',
    category: 'allowance',
    countryCode: null,
    deliveryMode: BenefitDeliveryMode.CASH,
    affectsPayroll: true,
    affectsTax: true,
  },
] as const;

export const DEFAULT_DOCUMENT_TEMPLATES = [
  {
    code: 'OFFER_LETTER_EMPLOYEE',
    documentType: DocumentType.OFFER_LETTER,
    audience: DocumentAudience.EMPLOYEE,
    countryCode: null,
    body: `{{legal_entity.registered_name}}
{{legal_entity.address_block}}
{{legal_entity.statutory_ids_block}}
Tel: {{legal_entity.phone}} | Email: {{legal_entity.email}}
Website: {{legal_entity.website}}

OFFER OF EMPLOYMENT

Dear {{worker.firstName}},

On behalf of {{legal_entity.registered_name}} ("Company"), we are pleased to offer you the position of {{worker.jobTitle}}, commencing on {{worker.startDate}}.

This offer is issued by {{legal_entity.registered_name}}, incorporated under the laws of {{legal_entity.country_code}}, with registered office at the address above.

Please sign and return this letter to confirm acceptance.

Yours sincerely,
People Operations
{{legal_entity.registered_name}}

{{legal_entity.footer_text}}`,
    mergeFieldSchema: {
      'legal_entity.registered_name': { type: 'string', label: 'Registered name' },
      'legal_entity.address_block': { type: 'string', label: 'Registered address' },
      'legal_entity.statutory_ids_block': { type: 'string', label: 'Registration numbers' },
      'legal_entity.phone': { type: 'string', label: 'Phone' },
      'legal_entity.email': { type: 'string', label: 'Email' },
      'legal_entity.website': { type: 'string', label: 'Website' },
      'legal_entity.country_code': { type: 'string', label: 'Country' },
      'legal_entity.footer_text': { type: 'string', label: 'Footer' },
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
    body: `{{legal_entity.registered_name}}
{{legal_entity.address_block}}
{{legal_entity.statutory_ids_block}}
Tel: {{legal_entity.phone}} | Email: {{legal_entity.email}}

EMPLOYMENT AGREEMENT

This Employment Agreement is made between:

(1) {{legal_entity.registered_name}} ("Employer"), registered in {{legal_entity.country_code}} at {{legal_entity.address_line_1}}, {{legal_entity.city}}; and

(2) {{worker.fullName}} ("Employee").

1. Commencement
Employment begins on {{worker.startDate}} in {{worker.countryCode}}.

2. Governing law
This agreement is governed by the laws of {{legal_entity.country_code}}.

Signed for and on behalf of {{legal_entity.registered_name}}

_______________________________
Authorised signatory

{{legal_entity.footer_text}}`,
    mergeFieldSchema: {
      'legal_entity.registered_name': { type: 'string' },
      'legal_entity.address_block': { type: 'string' },
      'legal_entity.statutory_ids_block': { type: 'string' },
      'legal_entity.phone': { type: 'string' },
      'legal_entity.email': { type: 'string' },
      'legal_entity.address_line_1': { type: 'string' },
      'legal_entity.city': { type: 'string' },
      'legal_entity.country_code': { type: 'string' },
      'legal_entity.footer_text': { type: 'string' },
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
    body: `{{legal_entity.registered_name}}
{{legal_entity.address_block}}
{{legal_entity.statutory_ids_block}}

NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement is entered into as of {{document.effectiveDate}} between {{legal_entity.registered_name}} ("Disclosing Party"), with registered office at {{legal_entity.address_line_1}}, {{legal_entity.city}}, {{legal_entity.country_code}}, and {{worker.fullName}} ("Receiving Party").

The Receiving Party agrees to keep confidential all proprietary information disclosed by the Disclosing Party.

Governing law: {{legal_entity.country_code}}.

{{legal_entity.footer_text}}`,
    mergeFieldSchema: {
      'legal_entity.registered_name': { type: 'string' },
      'legal_entity.address_block': { type: 'string' },
      'legal_entity.statutory_ids_block': { type: 'string' },
      'legal_entity.address_line_1': { type: 'string' },
      'legal_entity.city': { type: 'string' },
      'legal_entity.country_code': { type: 'string' },
      'legal_entity.footer_text': { type: 'string' },
      'worker.fullName': { type: 'string' },
      'document.effectiveDate': { type: 'date' },
    },
  },
  {
    code: 'CONTRACTOR_SOW',
    documentType: DocumentType.SOW,
    audience: DocumentAudience.CONTRACTOR,
    countryCode: null,
    body: `{{legal_entity.registered_name}}
{{legal_entity.address_block}}
{{legal_entity.statutory_ids_block}}
Tel: {{legal_entity.phone}} | Email: {{legal_entity.email}}
Website: {{legal_entity.website}}

STATEMENT OF WORK

This Statement of Work ("SOW") is entered into between:

(1) {{legal_entity.registered_name}} ("Company"), a company incorporated under the laws of {{legal_entity.country_code}}, with registered office at {{legal_entity.address_line_1}}, {{legal_entity.city}}, {{legal_entity.country_code}}; and

(2) {{worker.fullName}} ("Contractor").

1. Scope of services
{{sow.scope}}

2. Commercial terms
Fee / rate: {{sow.rate}}
Currency: as agreed in the master services agreement and payable by {{legal_entity.registered_name}}.

3. Company particulars
Registered name: {{legal_entity.registered_name}}
Trading name: {{legal_entity.trading_name}}
{{legal_entity.statutory_ids_block}}
Contact: {{legal_entity.phone}} / {{legal_entity.email}}

4. Governing law and notices
This SOW is governed by the laws of {{legal_entity.country_code}}. Notices to the Company shall be sent to {{legal_entity.email}} or the registered address above.

Signed for {{legal_entity.registered_name}}

Signature: _______________________________
Name / Title: ____________________________
Date: ____________________________________

Signed by Contractor

Signature: _______________________________
Name: {{worker.fullName}}
Date: ____________________________________

{{legal_entity.footer_text}}`,
    mergeFieldSchema: {
      'legal_entity.registered_name': { type: 'string', label: 'Registered name' },
      'legal_entity.trading_name': { type: 'string', label: 'Trading name' },
      'legal_entity.address_block': { type: 'string', label: 'Registered address' },
      'legal_entity.address_line_1': { type: 'string' },
      'legal_entity.city': { type: 'string' },
      'legal_entity.postal_code': { type: 'string' },
      'legal_entity.statutory_ids_block': { type: 'string', label: 'Registration numbers' },
      'legal_entity.phone': { type: 'string' },
      'legal_entity.email': { type: 'string' },
      'legal_entity.website': { type: 'string' },
      'legal_entity.country_code': { type: 'string' },
      'legal_entity.footer_text': { type: 'string' },
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
