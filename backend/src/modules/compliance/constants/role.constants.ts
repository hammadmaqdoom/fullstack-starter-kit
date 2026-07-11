import { PolarisRoleCode } from '../enums/polaris-role-code.enum';

export const SYSTEM_ROLES: Array<{
  id: string;
  code: PolarisRoleCode;
  name: string;
}> = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    code: PolarisRoleCode.EMPLOYEE,
    name: 'Employee',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000002',
    code: PolarisRoleCode.CONTRACTOR,
    name: 'Contractor',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000003',
    code: PolarisRoleCode.MANAGER,
    name: 'Manager',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000004',
    code: PolarisRoleCode.FINANCE,
    name: 'Finance',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000005',
    code: PolarisRoleCode.PEOPLE_OPS,
    name: 'People Ops',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000006',
    code: PolarisRoleCode.IT_ADMIN,
    name: 'IT Admin',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000007',
    code: PolarisRoleCode.DIVISION_HEAD,
    name: 'Division Head',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000008',
    code: PolarisRoleCode.SUPER_ADMIN,
    name: 'Super Admin',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000009',
    code: PolarisRoleCode.HRBP,
    name: 'HR Business Partner',
  },
];
