import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';

const PAYROLL_ADMIN_ROLES: string[] = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

export function isPayrollAdmin(auth: PolarisAuthContext): boolean {
  return auth.roleCodes.some((code) => PAYROLL_ADMIN_ROLES.includes(code));
}
