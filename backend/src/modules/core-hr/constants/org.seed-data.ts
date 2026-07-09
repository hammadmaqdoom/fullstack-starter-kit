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

export const LEGAL_ENTITY_SEED = [
  {
    id: 'e0000000-0000-4000-8000-000000000001',
    code: 'DIGITARO_LABS_PK',
    registeredName: 'Digitaro Labs (Private) Limited',
    tradingName: 'Digitaro Labs',
    countryCode: 'PK',
    functionalCurrency: 'PKR',
    effectiveFrom: '2020-01-01',
  },
  {
    id: 'e0000000-0000-4000-8000-000000000002',
    code: 'DIGITARO_STUDIO_UAE',
    registeredName: 'Digitaro Studio FZ-LLC',
    tradingName: 'Digitaro Studio',
    countryCode: 'AE',
    functionalCurrency: 'AED',
    effectiveFrom: '2020-01-01',
  },
  {
    id: 'e0000000-0000-4000-8000-000000000003',
    code: 'DIGITARO_SG',
    registeredName: 'Digitaro Pte. Ltd.',
    tradingName: 'Digitaro',
    countryCode: 'SG',
    functionalCurrency: 'SGD',
    effectiveFrom: '2020-01-01',
  },
] as const;
