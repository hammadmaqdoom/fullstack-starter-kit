export enum PayoutRail {
  ASPIRE = 'aspire',
  WISE = 'wise',
  MANUAL_BANK = 'manual_bank',
}

export enum FundingAccountProvider {
  ASPIRE = 'aspire',
  WISE = 'wise',
  MANUAL_BANK = 'manual_bank',
}

export enum PayoutBatchType {
  PAYROLL = 'payroll',
  EXPENSE_REIMBURSEMENT = 'expense_reimbursement',
  CONTRACTOR = 'contractor',
}

export enum PayoutBatchStatus {
  DRAFT = 'draft',
  PREVIEWED = 'previewed',
  SUBMITTED = 'submitted',
  FUNDING = 'funding',
  PROCESSING = 'processing',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PayoutLineStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  PAID = 'paid',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ProviderCatalogKind {
  ASPIRE_INCORPORATION = 'aspire_incorporation',
  ASPIRE_PAYOUT_CORRIDOR = 'aspire_payout_corridor',
  WISE_BLOCKED_COUNTRY = 'wise_blocked_country',
  WISE_CURRENCY_RULE = 'wise_currency_rule',
}

export enum PayoutSourceType {
  PAY_RUN_LINE = 'pay_run_line',
  EXPENSE_CLAIM = 'expense_claim',
  CONTRACTOR_PAYMENT_LINE = 'contractor_payment_line',
}

export enum CorporateCardProvider {
  ASPIRE = 'aspire',
  WISE = 'wise',
}

export enum CorporateCardStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CANCELLED = 'cancelled',
}

export enum BankFeedMatchStatus {
  UNMATCHED = 'unmatched',
  MATCHED_PAYOUT = 'matched_payout',
  MATCHED_CARD = 'matched_card',
  IGNORED = 'ignored',
}
