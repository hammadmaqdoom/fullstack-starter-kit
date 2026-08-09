export const DIVISION_SEED = [
  {
    id: 'd0000000-0000-4000-8000-000000000001',
    name: 'Labs',
  },
  {
    id: 'd0000000-0000-4000-8000-000000000002',
    name: 'Studio',
  },
] as const;

export type LegalEntitySeed = {
  id: string;
  code: string;
  registeredName: string;
  tradingName: string;
  countryCode: string;
  functionalCurrency: string;
  effectiveFrom: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateProvince?: string | null;
  postalCode?: string | null;
  phone: string;
  email: string;
  website: string;
  footerText: string;
  statutoryIds: ReadonlyArray<{ fieldKey: string; fieldValue: string }>;
};

export const LEGAL_ENTITY_SEED: readonly LegalEntitySeed[] = [
  {
    id: 'e0000000-0000-4000-8000-000000000001',
    code: 'DIGITARO_LABS_PK',
    registeredName: 'Digitaro Labs (Private) Limited',
    tradingName: 'Digitaro Labs',
    countryCode: 'PK',
    functionalCurrency: 'PKR',
    effectiveFrom: '2020-01-01',
    addressLine1: 'Office 12, Plot 45, I-9/3 Industrial Area',
    addressLine2: null,
    city: 'Islamabad',
    stateProvince: 'Islamabad Capital Territory',
    postalCode: '44000',
    phone: '+92 51 8899 0100',
    email: 'legal.pk@digitaro.co',
    website: 'https://digitaro.co',
    footerText:
      'Confidential. Digitaro Labs (Private) Limited. Registered in Pakistan. All rights reserved.',
    statutoryIds: [
      { fieldKey: 'ntn', fieldValue: '1234567-8' },
      { fieldKey: 'secp_registration', fieldValue: '0123456' },
      { fieldKey: 'eobi_employer_number', fieldValue: 'EOBI-PK-77881' },
    ],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000002',
    code: 'DIGITARO_STUDIO_UAE',
    registeredName: 'Digitaro Studio FZ-LLC',
    tradingName: 'Digitaro Studio',
    countryCode: 'AE',
    functionalCurrency: 'AED',
    effectiveFrom: '2020-01-01',
    addressLine1: 'In5 Tech, Dubai Internet City',
    addressLine2: 'Building 5, Office 204',
    city: 'Dubai',
    stateProvince: 'Dubai',
    postalCode: null,
    phone: '+971 4 440 0100',
    email: 'legal.ae@digitaro.co',
    website: 'https://digitaro.co',
    footerText:
      'Confidential. Digitaro Studio FZ-LLC. Free zone company, UAE. All rights reserved.',
    statutoryIds: [
      { fieldKey: 'trade_licence_number', fieldValue: 'TL-552211' },
      { fieldKey: 'mohre_establishment_id', fieldValue: 'MOHRE-889900' },
      { fieldKey: 'vat_trn', fieldValue: '100123456700003' },
    ],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000003',
    code: 'DIGITARO_SG',
    registeredName: 'Digitaro Pte. Ltd.',
    tradingName: 'Digitaro',
    countryCode: 'SG',
    functionalCurrency: 'SGD',
    effectiveFrom: '2020-01-01',
    addressLine1: '68 Circular Road, #02-01',
    addressLine2: null,
    city: 'Singapore',
    stateProvince: null,
    postalCode: '049422',
    phone: '+65 6911 0100',
    email: 'legal.sg@digitaro.co',
    website: 'https://digitaro.co',
    footerText:
      'Confidential. Digitaro Pte. Ltd. Incorporated in Singapore. All rights reserved.',
    statutoryIds: [
      { fieldKey: 'uen', fieldValue: '201912345A' },
      { fieldKey: 'cpf_employer_ref', fieldValue: 'CPF-SG-441122' },
      { fieldKey: 'gst_registration', fieldValue: 'M2-1234567-8' },
    ],
  },
] as const;

/** Human labels for statutory field keys shown on documents / letterhead. */
export const LEGAL_ENTITY_STATUTORY_LABELS: Record<string, string> = {
  ntn: 'NTN',
  secp_registration: 'SECP Registration',
  eobi_employer_number: 'EOBI Employer No.',
  trade_licence_number: 'Trade Licence',
  mohre_establishment_id: 'MOHRE Establishment ID',
  vat_trn: 'VAT TRN',
  uen: 'UEN',
  cpf_employer_ref: 'CPF Employer Ref',
  gst_registration: 'GST Registration',
};
