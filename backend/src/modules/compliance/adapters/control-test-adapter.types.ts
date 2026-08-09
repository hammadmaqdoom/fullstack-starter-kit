export type AdapterEvidenceRef = {
  kind: string;
  id?: string;
  path?: string;
  label?: string;
};

export type AdapterRunResult = {
  result: 'pass' | 'fail' | 'manual' | 'error' | 'skipped';
  summary: Record<string, unknown>;
  evidenceRefs: AdapterEvidenceRef[];
};

export interface ControlTestAdapter {
  readonly key: string;
  run(tenantId: string): Promise<AdapterRunResult>;
}

/** Default SLA: Entra disabled within 1 calendar day of last working day. */
export const OFFBOARD_ENTRA_SLA_DAYS = 1;
