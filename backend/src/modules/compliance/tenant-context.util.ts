import { ForbiddenException } from '@nestjs/common';
import { DIGITARO_TENANT_ID } from './constants/tenant.constants';

/**
 * Single seam for HTTP tenant resolution.
 * v1: Digitaro only. Later: derive from session membership.
 * Never accept client-supplied tenantId.
 */
export function resolveTenantId(_session?: { user?: { id?: string } }): string {
  return DIGITARO_TENANT_ID;
}

export function assertSameTenant(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new ForbiddenException('Tenant mismatch');
  }
}
