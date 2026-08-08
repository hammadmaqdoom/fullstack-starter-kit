import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  toWorkerResponse,
  WorkerResponse,
} from '@/modules/core-hr/worker.mapper';

/**
 * Map nested worker relations through Core-HR redaction (compensation / statutory).
 */
export function redactNestedWorker(
  worker: WorkerEntity | null | undefined,
  auth: PolarisAuthContext,
): WorkerResponse | null {
  if (!worker) {
    return null;
  }
  return toWorkerResponse(worker, auth);
}

export function isPeopleOpsOrSuperAdmin(auth: PolarisAuthContext): boolean {
  return auth.roleCodes.some((code) =>
    [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
      code as PolarisRoleCode,
    ),
  );
}

/** Separation reason is restricted to People Ops / Super Admin. */
export function redactSeparationReason(
  reason: string | null | undefined,
  auth: PolarisAuthContext,
): string | null {
  if (isPeopleOpsOrSuperAdmin(auth)) {
    return reason ?? null;
  }
  return null;
}
