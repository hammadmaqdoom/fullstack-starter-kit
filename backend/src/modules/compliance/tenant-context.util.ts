import { DIGITARO_TENANT_ID } from './constants/tenant.constants';

/**
 * Single seam for HTTP tenant resolution.
 * v1: Digitaro only. Later: derive from session membership.
 * Never accept client-supplied tenantId for evidence-layer APIs.
 */
export function resolveTenantId(_session?: { user?: { id?: string } }): string {
  return DIGITARO_TENANT_ID;
}
