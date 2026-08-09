import { PayoutRail, ProviderCatalogKind } from '../enums/payout.enum';

/** Aspire account-opening (incorporation) countries — official Aspire Help list. */
export const ASPIRE_INCORPORATION_COUNTRIES = [
  'AU',
  'CN',
  'HK',
  'IN',
  'ID',
  'MY',
  'MV',
  'MN',
  'PH',
  'SG',
  'KR',
  'LK',
  'TW',
  'TH',
  'US',
  'VN',
] as const;

/** Digitaro-relevant Aspire payout destination countries (seed; admin-updatable). */
export const ASPIRE_PAYOUT_CORRIDOR_COUNTRIES = [
  'SG',
  'AE',
  'PK',
  'MY',
  'ID',
  'PH',
  'VN',
  'TH',
  'IN',
  'HK',
  'US',
  'GB',
  'AU',
] as const;

/** Wise blocked send/receive countries (alpha-2 where applicable). */
export const WISE_BLOCKED_COUNTRIES = [
  'AF',
  'BY',
  'BI',
  'CF',
  'TD',
  'CG',
  'CD',
  'CU',
  'ER',
  'IR',
  'IQ',
  'KP',
  'LY',
  'MM',
  'SO',
  'SS',
  'RU',
  'SD',
  'SY',
  'YE',
  'VE',
] as const;

export type CatalogSeedRow = {
  kind: ProviderCatalogKind;
  countryCode: string | null;
  currencyCode: string | null;
  payload: Record<string, unknown>;
  isAllowed: boolean;
};

export function buildProviderCapabilitySeedRows(): CatalogSeedRow[] {
  const rows: CatalogSeedRow[] = [];

  for (const countryCode of ASPIRE_INCORPORATION_COUNTRIES) {
    rows.push({
      kind: ProviderCatalogKind.ASPIRE_INCORPORATION,
      countryCode,
      currencyCode: null,
      payload: {},
      isAllowed: true,
    });
  }

  for (const countryCode of ASPIRE_PAYOUT_CORRIDOR_COUNTRIES) {
    rows.push({
      kind: ProviderCatalogKind.ASPIRE_PAYOUT_CORRIDOR,
      countryCode,
      currencyCode: null,
      payload:
        countryCode === 'PK'
          ? { settlement: 'swift' }
          : { settlement: 'local_or_swift' },
      isAllowed: true,
    });
  }

  for (const countryCode of WISE_BLOCKED_COUNTRIES) {
    rows.push({
      kind: ProviderCatalogKind.WISE_BLOCKED_COUNTRY,
      countryCode,
      currencyCode: null,
      payload: {},
      isAllowed: false,
    });
  }

  rows.push({
    kind: ProviderCatalogKind.WISE_CURRENCY_RULE,
    countryCode: 'PK',
    currencyCode: 'PKR',
    payload: { personalOnly: true },
    isAllowed: true,
  });

  return rows;
}

/** Default rails by payer legal-entity country (seed table lookup). */
const ENTITY_COUNTRY_RAIL_DEFAULTS: Record<
  string,
  {
    primaryRail: PayoutRail;
    secondaryRail: PayoutRail | null;
    fallbackRail: PayoutRail;
  }
> = {
  SG: {
    primaryRail: PayoutRail.ASPIRE,
    secondaryRail: PayoutRail.WISE,
    fallbackRail: PayoutRail.MANUAL_BANK,
  },
  PK: {
    primaryRail: PayoutRail.MANUAL_BANK,
    secondaryRail: null,
    fallbackRail: PayoutRail.MANUAL_BANK,
  },
  AE: {
    primaryRail: PayoutRail.WISE,
    secondaryRail: PayoutRail.MANUAL_BANK,
    fallbackRail: PayoutRail.MANUAL_BANK,
  },
};

export function defaultRailsForEntityCountry(countryCode: string): {
  primaryRail: PayoutRail;
  secondaryRail: PayoutRail | null;
  fallbackRail: PayoutRail;
} {
  return (
    ENTITY_COUNTRY_RAIL_DEFAULTS[countryCode.toUpperCase()] ?? {
      primaryRail: PayoutRail.MANUAL_BANK,
      secondaryRail: null,
      fallbackRail: PayoutRail.MANUAL_BANK,
    }
  );
}

/** Digitaro seed corridor overrides (payer × recipient). */
export const DEFAULT_CORRIDOR_OVERRIDES: Array<{
  payerCountryCode: string;
  recipientBankCountryCode: string;
  primaryRail: PayoutRail;
  secondaryRail: PayoutRail | null;
  fallbackRail: PayoutRail;
}> = [
  {
    payerCountryCode: 'SG',
    recipientBankCountryCode: 'SG',
    primaryRail: PayoutRail.ASPIRE,
    secondaryRail: PayoutRail.WISE,
    fallbackRail: PayoutRail.MANUAL_BANK,
  },
  {
    payerCountryCode: 'SG',
    recipientBankCountryCode: 'PK',
    primaryRail: PayoutRail.ASPIRE,
    secondaryRail: PayoutRail.WISE,
    fallbackRail: PayoutRail.MANUAL_BANK,
  },
  {
    payerCountryCode: 'SG',
    recipientBankCountryCode: 'AE',
    primaryRail: PayoutRail.ASPIRE,
    secondaryRail: PayoutRail.WISE,
    fallbackRail: PayoutRail.MANUAL_BANK,
  },
];
