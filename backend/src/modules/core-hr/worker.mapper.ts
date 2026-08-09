import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import {
  CompensationBand,
  WorkerEntity,
} from './entities/worker.entity';
import { ContractorProfileEntity } from './entities/contractor-profile.entity';

const SENSITIVE_ROLES = new Set<string>([
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.SUPER_ADMIN,
]);

const COMPENSATION_ROLES = new Set<string>([
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
]);

export type WorkerResponse = Omit<
  WorkerEntity,
  'tenant' | 'employmentType' | 'deletedAt'
> & {
  contractorProfile?: ContractorProfileEntity | null;
  statutoryFields?: Record<string, string> | null;
  compensationBand?: CompensationBand | null;
};

export function toWorkerResponse(
  worker: WorkerEntity,
  auth: PolarisAuthContext,
  contractorProfile?: ContractorProfileEntity | null,
  statutoryFields: Record<string, string> = {},
): WorkerResponse {
  const roleCodes = new Set(auth.roleCodes.map((code) => code.toLowerCase()));
  const canViewStatutory = [...roleCodes].some((code) =>
    SENSITIVE_ROLES.has(code),
  );
  const canViewCompensation = [...roleCodes].some((code) =>
    COMPENSATION_ROLES.has(code),
  );

  const canViewDob =
    (worker.userId != null && worker.userId === auth.userId) ||
    [...roleCodes].some((code) => SENSITIVE_ROLES.has(code));

  const { tenant, employmentType, deletedAt, dateOfBirth, ...rest } = worker;

  return {
    ...rest,
    dateOfBirth: canViewDob ? dateOfBirth : null,
    statutoryFields: canViewStatutory ? statutoryFields : null,
    compensationBand: canViewCompensation ? worker.compensationBand : null,
    contractorProfile: contractorProfile ?? null,
  };
}
