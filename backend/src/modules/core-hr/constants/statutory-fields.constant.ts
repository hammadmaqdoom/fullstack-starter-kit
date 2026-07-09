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
