export enum PayrollRoute {
  EMPLOYEE_PAY_RUN = 'employee_pay_run',
  CONTRACTOR_INVOICE = 'contractor_invoice',
  EXCLUDED = 'excluded',
}

export enum RateType {
  SPOT = 'spot',
  MONTHLY_AVG = 'monthly_avg',
  BUDGET = 'budget',
}

export enum RateSource {
  FRANKFURTER = 'frankfurter',
  MANUAL_OVERRIDE = 'manual_override',
  COMPUTED_AVG = 'computed_avg',
}

export enum RateStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUPERSEDED = 'superseded',
}

export enum FetchStatus {
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILED = 'failed',
}
