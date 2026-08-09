/** Non-org constants used by worker forms. Org pickers load from `/api/v1/org/*`. */
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
