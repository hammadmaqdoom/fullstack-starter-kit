export enum PayComponentType {
  EARNING = 'earning',
  DEDUCTION = 'deduction',
  EMPLOYER_CONTRIBUTION = 'employer_contribution',
}

export enum PayFrequency {
  MONTHLY = 'monthly',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum PayRunStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  EXPORTED = 'exported',
  LOCKED = 'locked',
}

export enum PayslipStatus {
  DRAFT = 'draft',
  RELEASED = 'released',
}

export enum StatutoryScheduleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUPERSEDED = 'superseded',
}

export enum StatutoryRateUnit {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum EmployeeBenefitStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  DRAFT = 'draft',
}

export enum BenefitTypeFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
}

export enum ExportFileFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  PDF = 'pdf',
}

export enum FinanceExportType {
  PAY_RUN = 'pay_run',
  CONTRACTOR_BATCH = 'contractor_batch',
}

/**
 * FLW-PAY-002 — Draft (invoices aggregated) → Review (Finance reviews
 * lines/withholding) → Approved → Exported (export pack downloaded) →
 * Locked (all lines paid; reserved for a later task).
 */
export enum ContractorPaymentBatchStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  EXPORTED = 'exported',
  LOCKED = 'locked',
}
