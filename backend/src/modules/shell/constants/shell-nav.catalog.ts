import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ShellLayout } from '../enums/shell-layout.enum';
import { ShellModuleItem, ShellSearchHit } from '../types/shell.type';

const EMPLOYEE_MODULES: ShellModuleItem[] = [
  { id: 'home', href: '/employee/home', group: 'primary', labelKey: 'employee_home_link' },
  { id: 'calendar', href: '/employee/calendar', group: 'primary', labelKey: 'employee_calendar_link' },
  { id: 'hub', href: '/hub', group: 'primary', labelKey: 'hub_link' },
  { id: 'me', href: '/employee/profile', group: 'primary', labelKey: 'employee_profile_link' },
  { id: 'leave', href: '/employee/leave', group: 'more', labelKey: 'employee_leave_link' },
  { id: 'policies', href: '/employee/policies', group: 'more', labelKey: 'employee_policies_link' },
  { id: 'documents', href: '/employee/documents', group: 'more', labelKey: 'employee_documents_link' },
  { id: 'directory', href: '/employee/directory', group: 'more', labelKey: 'employee_directory_link' },
  { id: 'performance', href: '/employee/performance', group: 'more', labelKey: 'employee_performance_link' },
  { id: 'help', href: '/employee/help', group: 'more', labelKey: 'employee_help_link' },
  { id: 'security', href: '/dashboard/security', group: 'more', labelKey: 'security_link' },
  { id: 'sessions', href: '/dashboard/sessions', group: 'more', labelKey: 'sessions_link' },
];

const MANAGER_MODULES: ShellModuleItem[] = [
  ...EMPLOYEE_MODULES,
  { id: 'manager_cockpit', href: '/manager/cockpit', group: 'more', labelKey: 'manager_cockpit_link' },
  { id: 'manager_calendar', href: '/manager/calendar', group: 'more', labelKey: 'manager_calendar_link' },
  { id: 'manager_performance', href: '/manager/performance', group: 'more', labelKey: 'manager_performance_link' },
];

const CONTRACTOR_MODULES: ShellModuleItem[] = [
  { id: 'home', href: '/contractor/dashboard', group: 'primary', labelKey: 'contractor_home_link' },
  { id: 'invoices', href: '/contractor/invoices', group: 'primary', labelKey: 'contractor_invoices_link' },
  { id: 'documents', href: '/contractor/documents', group: 'primary', labelKey: 'contractor_documents_link' },
  { id: 'me', href: '/contractor/profile', group: 'primary', labelKey: 'contractor_profile_link' },
  { id: 'security', href: '/dashboard/security', group: 'more', labelKey: 'security_link' },
  { id: 'sessions', href: '/dashboard/sessions', group: 'more', labelKey: 'sessions_link' },
];

const PEOPLE_OPS_MODULES: ShellModuleItem[] = [
  { id: 'hr_dashboard', href: '/people-ops/dashboard', group: 'people_ops', labelKey: 'hr_dashboard_link' },
  { id: 'workers', href: '/people-ops/workers', group: 'people_ops', labelKey: 'workers_link' },
  { id: 'org', href: '/people-ops/org', group: 'people_ops', labelKey: 'org_link' },
  { id: 'pre_boarding', href: '/people-ops/pre-boarding', group: 'people_ops', labelKey: 'pre_boarding_link' },
  { id: 'onboarding', href: '/people-ops/onboarding', group: 'people_ops', labelKey: 'onboarding_link' },
  { id: 'separations', href: '/people-ops/separations', group: 'people_ops', labelKey: 'separations_link' },
  { id: 'policies', href: '/people-ops/policies', group: 'people_ops', labelKey: 'policies_link' },
  { id: 'compliance', href: '/people-ops/compliance', group: 'people_ops', labelKey: 'compliance_link' },
  { id: 'audit', href: '/people-ops/audit', group: 'people_ops', labelKey: 'audit_link' },
  { id: 'leave_admin', href: '/people-ops/leave', group: 'people_ops', labelKey: 'leave_admin_link' },
  { id: 'documents_register', href: '/people-ops/documents/register', group: 'people_ops', labelKey: 'document_register_link' },
  { id: 'templates', href: '/people-ops/templates', group: 'people_ops', labelKey: 'templates_link' },
  { id: 'letterheads', href: '/people-ops/letterheads', group: 'people_ops', labelKey: 'letterheads_link' },
  { id: 'performance', href: '/people-ops/performance', group: 'people_ops', labelKey: 'performance_link' },
  { id: 'hub', href: '/hub', group: 'people_ops', labelKey: 'hub_link' },
  { id: 'setup', href: '/admin/setup', group: 'people_ops', labelKey: 'setup_link' },
];

const FINANCE_MODULES: ShellModuleItem[] = [
  { id: 'pay_runs', href: '/finance/pay-runs', group: 'finance', labelKey: 'finance_pay_runs_link' },
  { id: 'benefits', href: '/finance/benefits', group: 'finance', labelKey: 'finance_benefits_link' },
  { id: 'statutory_rates', href: '/finance/statutory-rates', group: 'finance', labelKey: 'finance_statutory_rates_link' },
  { id: 'contractor_payments', href: '/finance/contractor-payments', group: 'finance', labelKey: 'finance_contractor_payments_link' },
  { id: 'fx', href: '/finance/fx', group: 'finance', labelKey: 'finance_fx_link' },
  { id: 'hub', href: '/hub', group: 'finance', labelKey: 'hub_link' },
];

const ADMIN_MODULES: ShellModuleItem[] = [
  ...PEOPLE_OPS_MODULES,
  ...FINANCE_MODULES.filter((m) => m.id !== 'hub'),
];

const CATALOG: Record<ShellLayout, ShellModuleItem[]> = {
  [ShellLayout.EMPLOYEE]: EMPLOYEE_MODULES,
  [ShellLayout.MANAGER]: MANAGER_MODULES,
  [ShellLayout.CONTRACTOR]: CONTRACTOR_MODULES,
  [ShellLayout.PEOPLE_OPS]: PEOPLE_OPS_MODULES,
  [ShellLayout.FINANCE]: FINANCE_MODULES,
  [ShellLayout.ADMIN]: ADMIN_MODULES,
};

export function modulesForLayout(layout: ShellLayout): ShellModuleItem[] {
  return CATALOG[layout].map((item) => ({ ...item }));
}

type ActionDef = {
  id: string;
  title: string;
  href: string;
  roles: PolarisRoleCode[];
};

const ACTION_CATALOG: ActionDef[] = [
  {
    id: 'action:request_leave',
    title: 'Request leave',
    href: '/employee/leave',
    roles: [
      PolarisRoleCode.EMPLOYEE,
      PolarisRoleCode.MANAGER,
      PolarisRoleCode.DIVISION_HEAD,
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.SUPER_ADMIN,
    ],
  },
  {
    id: 'action:check_in',
    title: 'Check in',
    href: '/employee/home',
    roles: [
      PolarisRoleCode.EMPLOYEE,
      PolarisRoleCode.MANAGER,
      PolarisRoleCode.DIVISION_HEAD,
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.SUPER_ADMIN,
    ],
  },
  {
    id: 'action:open_hub',
    title: 'Open Hub',
    href: '/hub',
    roles: [
      PolarisRoleCode.EMPLOYEE,
      PolarisRoleCode.MANAGER,
      PolarisRoleCode.DIVISION_HEAD,
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.FINANCE,
      PolarisRoleCode.SUPER_ADMIN,
      PolarisRoleCode.IT_ADMIN,
      PolarisRoleCode.HRBP,
      PolarisRoleCode.CONTRACTOR,
    ],
  },
  {
    id: 'action:setup',
    title: 'Open setup wizard',
    href: '/admin/setup',
    roles: [
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.SUPER_ADMIN,
      PolarisRoleCode.IT_ADMIN,
      PolarisRoleCode.HRBP,
    ],
  },
  {
    id: 'action:workers',
    title: 'Manage workers',
    href: '/people-ops/workers',
    roles: [
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.SUPER_ADMIN,
      PolarisRoleCode.HRBP,
    ],
  },
];

export function actionsForRoles(roleCodes: string[]): ShellSearchHit[] {
  const normalized = new Set(roleCodes.map((c) => c.toLowerCase()));
  return ACTION_CATALOG.filter((action) =>
    action.roles.some((role) => normalized.has(role.toLowerCase())),
  ).map((action) => ({
    type: 'action' as const,
    id: action.id,
    title: action.title,
    href: action.href,
  }));
}

export function moduleToSearchHit(module: ShellModuleItem): ShellSearchHit {
  return {
    type: 'module',
    id: `module:${module.id}`,
    title: module.labelKey,
    href: module.href,
  };
}
