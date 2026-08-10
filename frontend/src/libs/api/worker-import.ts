import { apiRequest } from '@/libs/api/client';

export type WorkerImportRowValidation = {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  isValid: boolean;
  action: 'create' | 'update';
  existingWorkerId?: string;
};

export type WorkerImportPreview = {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: WorkerImportRowValidation[];
};

export type WorkerImportBatch = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName: string | null;
  totalRows: number;
  createdAt: string;
};

const BASE = '/api/v1/workers/import';

export async function previewWorkerImport(csv: string) {
  return apiRequest<WorkerImportPreview>(`${BASE}/preview`, {
    method: 'POST',
    body: { csv },
  });
}

export async function enqueueWorkerImport(csv: string, fileName?: string) {
  return apiRequest<WorkerImportBatch>(BASE, {
    method: 'POST',
    body: { csv, fileName },
  });
}

export async function listWorkerImportBatches() {
  return apiRequest<WorkerImportBatch[]>(BASE);
}
