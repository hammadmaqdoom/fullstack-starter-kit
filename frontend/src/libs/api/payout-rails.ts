import { apiRequest } from '@/libs/api/client';
import { Env } from '@/libs/Env';

export type FundingProvider = 'aspire' | 'wise' | 'manual_bank';
export type PayoutRail = 'aspire' | 'wise' | 'manual_bank';
export type PayoutBatchType = 'payroll' | 'expense_reimbursement' | 'contractor';
export type PayoutBatchStatus =
  | 'draft'
  | 'previewed'
  | 'submitted'
  | 'funding'
  | 'processing'
  | 'paid'
  | 'partially_paid'
  | 'failed'
  | 'cancelled';

export type FundingAccount = {
  id: string;
  legalEntityId: string;
  provider: FundingProvider;
  currency: string;
  label: string;
  isDefault: boolean;
  externalAccountId: string | null;
  bankDetails: Record<string, string> | null;
  createdAt: string;
};

export type CsvColumn = {
  key: string;
  label: string;
  enabled: boolean;
  order: number;
};

export type CsvExportProfile = {
  id: string;
  legalEntityId: string;
  name: string;
  columns: CsvColumn[];
  isDefault: boolean;
};

export type PayoutRailProfile = {
  id: string;
  legalEntityId: string;
  primaryRail: PayoutRail;
  secondaryRail: PayoutRail | null;
  defaultFundingAccountId: string | null;
};

export type PayoutCorridorOverride = {
  id: string;
  legalEntityId: string;
  payerCountryCode: string;
  recipientBankCountryCode: string;
  primaryRail: PayoutRail;
  secondaryRail: PayoutRail | null;
  reasonCode: string | null;
};

export type PayoutPreviewLine = {
  sourceType: string;
  sourceId: string;
  workerId: string;
  amount: string;
  currency: string;
  issues: string[];
};

export type PayoutBatchLine = {
  id: string;
  sourceType: string;
  sourceId: string;
  workerId: string;
  amount: string;
  currency: string;
  status: string;
  providerTransferId: string | null;
  paymentReference: string | null;
  issues: string[];
};

export type PayoutBatch = {
  id: string;
  batchType: PayoutBatchType;
  legalEntityId: string;
  sourceId: string | null;
  rail: PayoutRail;
  fundingAccountId: string | null;
  csvExportProfileId: string | null;
  status: PayoutBatchStatus;
  currencyCode: string;
  providerBatchId: string | null;
  reasonCodes: string[];
  lines?: PayoutBatchLine[];
};

export type BankFeedTxn = {
  id: string;
  fundingAccountId: string;
  providerTxnId: string;
  txnType: string;
  amount: string;
  currency: string;
  description: string | null;
  bookedAt: string | null;
  matchStatus: string;
};

export type CorporateCard = {
  id: string;
  legalEntityId: string;
  provider: 'aspire' | 'wise';
  label: string;
  currency: string;
  spendLimit: string | null;
  workerId: string | null;
  status: string;
  externalCardId: string | null;
};

export type CardTransaction = {
  id: string;
  corporateCardId: string;
  providerTxnId: string;
  amount: string;
  currency: string;
  merchant: string | null;
  transactedAt: string | null;
  expenseClaimId: string | null;
};

const FUNDING = '/api/v1/payroll/funding-accounts';
const RAIL_PROFILES = '/api/v1/payroll/payout-rail-profiles';
const CORRIDORS = '/api/v1/payroll/payout-corridor-overrides';
const CSV = '/api/v1/payroll/csv-export-profiles';
const BATCHES = '/api/v1/payroll/payout-batches';
const FEEDS = '/api/v1/payroll/bank-feeds';
const CARDS = '/api/v1/payroll/corporate-cards';

export async function listFundingAccounts(params?: {
  legalEntityId?: string;
  provider?: FundingProvider;
}) {
  return apiRequest<FundingAccount[]>(FUNDING, { params });
}

export async function createFundingAccount(body: {
  legalEntityId: string;
  provider: FundingProvider;
  currency: string;
  label: string;
  isDefault?: boolean;
  externalAccountId?: string;
  bankDetails?: Record<string, string>;
}) {
  return apiRequest<FundingAccount>(FUNDING, { method: 'POST', body });
}

export async function getPayoutRailProfile(legalEntityId: string) {
  return apiRequest<PayoutRailProfile | null>(`${RAIL_PROFILES}/${legalEntityId}`);
}

export async function updatePayoutRailProfile(
  legalEntityId: string,
  body: {
    primaryRail: PayoutRail;
    secondaryRail?: PayoutRail | null;
    defaultFundingAccountId?: string | null;
  },
) {
  return apiRequest<PayoutRailProfile>(`${RAIL_PROFILES}/${legalEntityId}`, {
    method: 'PATCH',
    body,
  });
}

export async function listCorridorOverrides() {
  return apiRequest<PayoutCorridorOverride[]>(CORRIDORS);
}

export async function upsertCorridorOverride(body: {
  legalEntityId: string;
  payerCountryCode: string;
  recipientBankCountryCode: string;
  primaryRail: PayoutRail;
  secondaryRail?: PayoutRail | null;
  reasonCode?: string;
}) {
  return apiRequest<PayoutCorridorOverride>(CORRIDORS, {
    method: 'POST',
    body,
  });
}

export async function listCsvExportProfiles(legalEntityId: string) {
  return apiRequest<CsvExportProfile[]>(CSV, {
    params: { legalEntityId },
  });
}

export async function createCsvExportProfile(body: {
  legalEntityId: string;
  name: string;
  columns: CsvColumn[];
  isDefault?: boolean;
}) {
  return apiRequest<CsvExportProfile>(CSV, { method: 'POST', body });
}

export async function updateCsvExportProfile(
  id: string,
  body: Partial<{ name: string; columns: CsvColumn[]; isDefault: boolean }>,
) {
  return apiRequest<CsvExportProfile>(`${CSV}/${id}`, {
    method: 'PATCH',
    body,
  });
}

export async function previewPayoutBatch(body: {
  batchType: PayoutBatchType;
  legalEntityId: string;
  sourceId: string;
  rail?: PayoutRail;
  fundingAccountId?: string;
}) {
  return apiRequest<{
    lines: PayoutPreviewLine[];
    resolution: {
      resolvedRail: PayoutRail;
      allowedRails: PayoutRail[];
      reasonCodes: string[];
      suggestedFundingAccountId: string | null;
    };
  }>(`${BATCHES}/preview`, { method: 'POST', body });
}

export async function createPayoutBatch(body: {
  batchType: PayoutBatchType;
  legalEntityId: string;
  sourceId: string;
  rail: PayoutRail;
  fundingAccountId: string;
  csvExportProfileId?: string;
}) {
  return apiRequest<PayoutBatch>(BATCHES, { method: 'POST', body });
}

export async function getPayoutBatch(id: string) {
  return apiRequest<PayoutBatch>(`${BATCHES}/${id}`);
}

export async function executeManualPayout(id: string) {
  const base = Env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '');
  const response = await fetch(`${base}${BATCHES}/${id}/execute-manual`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Manual payout export failed');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return { blob, fileName: match?.[1] ?? `payout-${id.slice(0, 8)}.csv` };
}

export async function confirmManualPaid(
  id: string,
  refs: Array<{ lineId: string; paymentReference: string }>,
) {
  return apiRequest<PayoutBatch>(`${BATCHES}/${id}/confirm-manual-paid`, {
    method: 'POST',
    body: { refs },
  });
}

export async function executeProviderPayout(id: string) {
  return apiRequest<PayoutBatch>(`${BATCHES}/${id}/execute-provider`, {
    method: 'POST',
  });
}

export async function retryPayoutWithSecondary(id: string) {
  return apiRequest<PayoutBatch>(`${BATCHES}/${id}/retry-with-secondary`, {
    method: 'POST',
  });
}

export async function syncBankFeed(fundingAccountId: string) {
  return apiRequest<{ inserted: number; updated: number }>(`${FEEDS}/sync`, {
    method: 'POST',
    body: { fundingAccountId },
  });
}

export async function listBankFeeds(params?: {
  matchStatus?: string;
  fundingAccountId?: string;
  page?: number;
  limit?: number;
}) {
  return apiRequest<BankFeedTxn[]>(FEEDS, { params });
}

export async function matchBankFeed(
  id: string,
  body: { payoutBatchLineId?: string; cardTransactionId?: string },
) {
  return apiRequest<BankFeedTxn>(`${FEEDS}/${id}/match`, {
    method: 'POST',
    body,
  });
}

export async function ignoreBankFeed(id: string) {
  return apiRequest<BankFeedTxn>(`${FEEDS}/${id}/ignore`, { method: 'POST' });
}

export async function listCorporateCards(legalEntityId?: string) {
  return apiRequest<CorporateCard[]>(CARDS, {
    params: legalEntityId ? { legalEntityId } : undefined,
  });
}

export async function issueCorporateCard(body: {
  legalEntityId: string;
  provider: 'aspire' | 'wise';
  label: string;
  currency: string;
  spendLimit: string;
  fundingAccountId: string;
  workerId?: string;
}) {
  return apiRequest<CorporateCard>(CARDS, { method: 'POST', body });
}

export async function listCardTransactions(cardId: string) {
  return apiRequest<CardTransaction[]>(`${CARDS}/${cardId}/transactions`);
}

export async function syncCardTransactions(cardId: string) {
  return apiRequest<number>(`${CARDS}/${cardId}/sync-transactions`, {
    method: 'POST',
  });
}

export async function allocateCardTransaction(
  txnId: string,
  body: { category: string; costCentre?: string; note?: string },
) {
  return apiRequest<{ expenseClaimId: string }>(
    `${CARDS}/transactions/${txnId}/allocate`,
    { method: 'POST', body },
  );
}

export const DEFAULT_CSV_COLUMNS: CsvColumn[] = [
  { key: 'workerEmployeeId', label: 'Employee ID', enabled: true, order: 1 },
  { key: 'workerName', label: 'Name', enabled: true, order: 2 },
  { key: 'accountNumber', label: 'Account number', enabled: true, order: 3 },
  { key: 'iban', label: 'IBAN', enabled: true, order: 4 },
  { key: 'bankCode', label: 'Bank code', enabled: false, order: 5 },
  { key: 'amount', label: 'Amount', enabled: true, order: 6 },
  { key: 'currency', label: 'Currency', enabled: true, order: 7 },
  { key: 'narration', label: 'Narration', enabled: true, order: 8 },
  { key: 'cnic', label: 'CNIC', enabled: false, order: 9 },
  { key: 'costCentre', label: 'Cost centre', enabled: false, order: 10 },
  { key: 'payerAccountNumber', label: 'Payer account', enabled: true, order: 11 },
  { key: 'payerIban', label: 'Payer IBAN', enabled: false, order: 12 },
  { key: 'payerSwift', label: 'Payer SWIFT', enabled: false, order: 13 },
];
