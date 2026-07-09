export interface ApiError {
  code: string;
  message: string;
  field?: string;
  status: number;
}

export interface ApiEnvelope<T = unknown> {
  data: T | null;
  meta: Record<string, unknown>;
  errors: ApiError[];
}

export interface PaginatedServiceResult<T> {
  items: T[];
  meta: Record<string, unknown>;
}
