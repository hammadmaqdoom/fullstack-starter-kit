/**
 * FLW-PAY-005 — cross-border remittance documentation packs. Corridor
 * configs are matched on payer (legal entity) country x beneficiary
 * (worker bank) country; `all` applies to both employee payroll and
 * contractor invoice payments.
 */
export enum RemittanceCorridorAppliesTo {
  ALL = 'all',
  EMPLOYEE_PAYROLL = 'employee_payroll',
  CONTRACTOR_INVOICE = 'contractor_invoice',
}

export enum RemittancePaymentSourceType {
  PAY_RUN_LINE = 'pay_run_line',
  CONTRACTOR_PAYMENT_LINE = 'contractor_payment_line',
}

/**
 * assembling (just created) -> partial (some required docs available) ->
 * complete (all required docs available). `incomplete` is reserved for a
 * Finance-forced close-out when a required doc can never be obtained
 * (waiver with audit reason per feature-flows.md exceptions).
 */
export enum RemittancePackStatus {
  ASSEMBLING = 'assembling',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
  INCOMPLETE = 'incomplete',
}

export enum RemittanceDocumentType {
  PAYSLIP_PDF = 'payslip_pdf',
  INVOICE_PDF = 'invoice_pdf',
  SIGNED_EMPLOYMENT_CONTRACT = 'signed_employment_contract',
  SIGNED_SOW = 'signed_sow',
  SIGNED_CONTRACT = 'signed_contract',
  SALARY_CONFIRMATION_LETTER = 'salary_confirmation_letter',
  PAYMENT_ADVICE = 'payment_advice',
  WITHHOLDING_CERTIFICATE = 'withholding_certificate',
  SWIFT_COPY = 'swift_copy',
  BANK_PAYMENT_PROOF = 'bank_payment_proof',
  WIRE_CONFIRMATION = 'wire_confirmation',
  TAX_REMIT_FORM = 'tax_remit_form',
  OTHER_SUPPORTING = 'other_supporting',
}

export enum RemittanceDocumentSource {
  AUTO = 'auto',
  FINANCE_UPLOAD = 'finance_upload',
  CONTRACTOR_UPLOAD = 'contractor_upload',
  GENERATED = 'generated',
}

export enum RemittanceDocumentStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  REJECTED = 'rejected',
}
