import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type RateStatus = 'pending' | 'active' | 'superseded';
export type RateSource = 'frankfurter' | 'manual_override' | 'computed_avg';
export type FetchStatus = 'success' | 'partial' | 'failed';

export type CurrencyCode = {
  code: string;
  name: string;
  decimalPlaces: number;
  symbol: string | null;
};

export type ExchangeRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  rateType: string;
  effectiveFrom: string;
  source: RateSource;
  status: RateStatus;
  approvedBy: string | null;
};

export type FxFetchBatch = {
  id: string;
  fetchedAt: string;
  source: string;
  status: FetchStatus;
  errorMessage: string | null;
};

export type FxVarianceAlertConfig = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  thresholdPercent: string;
  isActive: boolean;
  updatedByUserId: string | null;
  updatedAt: string;
};

const FX_BASE = '/api/v1/config/fx';

function withUnavailableFallback<T>(fallback: T) {
  return (err: unknown) => {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: fallback, meta: { unavailable: true } };
    }
    throw err;
  };
}

export async function listCurrencies() {
  try {
    return await apiRequest<CurrencyCode[]>(`${FX_BASE}/currencies`);
  } catch (err) {
    return withUnavailableFallback<CurrencyCode[]>([])(err);
  }
}

export async function listExchangeRates(params?: {
  fromCurrency?: string;
  toCurrency?: string;
  status?: RateStatus;
}) {
  try {
    return await apiRequest<ExchangeRate[]>(`${FX_BASE}/exchange-rates`, { params });
  } catch (err) {
    return withUnavailableFallback<ExchangeRate[]>([])(err);
  }
}

export async function getFxFetchStatus() {
  return apiRequest<FxFetchBatch | null>(`${FX_BASE}/fetch-status`);
}

export async function overrideExchangeRate(input: {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom: string;
  reason?: string;
}) {
  return apiRequest<ExchangeRate>(`${FX_BASE}/exchange-rates/override`, {
    method: 'POST',
    body: input,
  });
}

export async function approveExchangeRate(id: string) {
  return apiRequest<ExchangeRate>(`${FX_BASE}/exchange-rates/${id}/approve`, {
    method: 'POST',
  });
}

export async function listFxVarianceAlertConfigs() {
  try {
    return await apiRequest<FxVarianceAlertConfig[]>(`${FX_BASE}/variance-alerts`);
  } catch (err) {
    return withUnavailableFallback<FxVarianceAlertConfig[]>([])(err);
  }
}

export async function upsertFxVarianceAlertConfig(input: {
  fromCurrency: string;
  toCurrency: string;
  thresholdPercent: number;
  isActive?: boolean;
}) {
  return apiRequest<FxVarianceAlertConfig>(`${FX_BASE}/variance-alerts`, {
    method: 'PUT',
    body: input,
  });
}
