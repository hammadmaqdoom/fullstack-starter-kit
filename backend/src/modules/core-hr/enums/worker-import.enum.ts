export enum WorkerImportBatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed',
}

export enum WorkerImportRowOutcome {
  CREATED = 'created',
  UPDATED = 'updated',
  ERROR = 'error',
}
