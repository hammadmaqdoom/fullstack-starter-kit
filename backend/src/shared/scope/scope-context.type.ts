/**
 * First-class scope representation resolved from the authenticated user's
 * role assignments + linked worker record. Per enterprise-readiness.md §3.1 —
 * built early so repository queries can filter on a single object instead of
 * ad-hoc `divisionId` params. Additive: existing `PolarisAuthContext` /
 * `ScopedResourceTarget` consumers are unaffected.
 */
export interface ScopeContext {
  tenantId: string;
  divisionId?: string;
  legalEntityId?: string;
  departmentId?: string;
  countryCode?: string;
  /** Resolved direct-report worker ids (includes the acting worker) when the user holds team scope. */
  teamWorkerIds?: string[];
}
