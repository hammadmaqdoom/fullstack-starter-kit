export enum WorkerStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  SEPARATED = 'separated',
  ARCHIVED = 'archived',
}

export enum WorkMode {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  IN_OFFICE = 'in_office',
}

export enum EntraStatus {
  NOT_REQUIRED = 'not_required',
  PENDING = 'pending',
  PROVISIONED = 'provisioned',
  DISABLED = 'disabled',
}

export enum BillingModel {
  DAY_RATE = 'day_rate',
  HOURLY = 'hourly',
  FIXED_FEE = 'fixed_fee',
  RETAINER = 'retainer',
}
