/** Mirrors backend org seed — used for division/legal-entity pickers until org API ships. */
export const DIVISIONS = [
  { id: 'd0000000-0000-4000-8000-000000000001', name: 'Labs' },
  { id: 'd0000000-0000-4000-8000-000000000002', name: 'Studio' },
] as const;

export const LEGAL_ENTITIES = [
  {
    id: 'e0000000-0000-4000-8000-000000000001',
    code: 'DIGITARO_LABS_PK',
    name: 'Digitaro Labs',
    countryCode: 'PK',
  },
  {
    id: 'e0000000-0000-4000-8000-000000000002',
    code: 'DIGITARO_STUDIO_UAE',
    name: 'Digitaro Studio',
    countryCode: 'AE',
  },
  {
    id: 'e0000000-0000-4000-8000-000000000003',
    code: 'DIGITARO_SG',
    name: 'Digitaro Pte. Ltd.',
    countryCode: 'SG',
  },
] as const;

export const STATUTORY_FIELDS_BY_COUNTRY: Record<string, readonly string[]> = {
  PK: ['cnic', 'ntn', 'eobi_number'],
  AE: ['emirates_id', 'labour_card_number'],
  SG: ['nric', 'cpf_account'],
};

export const CONTRACTOR_TYPE_CODES = new Set([
  'CONTRACTOR',
  'CONSULTANT',
  'AGENCY',
]);
