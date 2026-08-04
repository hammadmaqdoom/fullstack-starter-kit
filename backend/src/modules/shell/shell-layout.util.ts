import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ShellLayout } from './enums/shell-layout.enum';
import { SecondaryLayout } from './types/shell.type';

const LAYOUT_HOME: Record<ShellLayout, string> = {
  [ShellLayout.EMPLOYEE]: '/employee/home',
  [ShellLayout.MANAGER]: '/employee/home',
  [ShellLayout.PEOPLE_OPS]: '/people-ops/dashboard',
  [ShellLayout.FINANCE]: '/finance/pay-runs',
  [ShellLayout.CONTRACTOR]: '/contractor/dashboard',
  [ShellLayout.ADMIN]: '/people-ops/dashboard',
};

const LAYOUT_LABEL: Record<ShellLayout, string> = {
  [ShellLayout.EMPLOYEE]: 'switch_employee',
  [ShellLayout.MANAGER]: 'switch_manager',
  [ShellLayout.PEOPLE_OPS]: 'switch_people_ops',
  [ShellLayout.FINANCE]: 'switch_finance',
  [ShellLayout.CONTRACTOR]: 'switch_contractor',
  [ShellLayout.ADMIN]: 'switch_admin',
};

/** Priority order: first match wins for primaryLayout. */
const LAYOUT_MATCHERS: Array<{
  layout: ShellLayout;
  roles: PolarisRoleCode[];
}> = [
  {
    layout: ShellLayout.ADMIN,
    roles: [PolarisRoleCode.SUPER_ADMIN, PolarisRoleCode.IT_ADMIN],
  },
  {
    layout: ShellLayout.PEOPLE_OPS,
    roles: [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.HRBP],
  },
  {
    layout: ShellLayout.FINANCE,
    roles: [PolarisRoleCode.FINANCE],
  },
  {
    layout: ShellLayout.MANAGER,
    roles: [PolarisRoleCode.MANAGER, PolarisRoleCode.DIVISION_HEAD],
  },
  {
    layout: ShellLayout.CONTRACTOR,
    roles: [PolarisRoleCode.CONTRACTOR],
  },
  {
    layout: ShellLayout.EMPLOYEE,
    roles: [PolarisRoleCode.EMPLOYEE],
  },
];

function normalizeRoles(roleCodes: string[]): Set<string> {
  return new Set(roleCodes.map((code) => code.toLowerCase()));
}

function layoutMatches(
  layout: ShellLayout,
  normalized: Set<string>,
): boolean {
  const matcher = LAYOUT_MATCHERS.find((m) => m.layout === layout);
  if (!matcher) {
    return false;
  }
  return matcher.roles.some((role) => normalized.has(role.toLowerCase()));
}

function firstMatchingLayout(normalized: Set<string>): ShellLayout {
  for (const matcher of LAYOUT_MATCHERS) {
    if (matcher.roles.some((role) => normalized.has(role.toLowerCase()))) {
      return matcher.layout;
    }
  }
  return ShellLayout.EMPLOYEE;
}

export function resolveShellLayout(roleCodes: string[]): {
  primaryLayout: ShellLayout;
  homePath: string;
  secondaryLayouts: SecondaryLayout[];
} {
  const normalized = normalizeRoles(roleCodes);
  const primaryLayout = firstMatchingLayout(normalized);
  const homePath = LAYOUT_HOME[primaryLayout];

  const secondaryLayouts: SecondaryLayout[] = [];
  for (const matcher of LAYOUT_MATCHERS) {
    if (matcher.layout === primaryLayout) {
      continue;
    }
    if (!layoutMatches(matcher.layout, normalized)) {
      continue;
    }
    secondaryLayouts.push({
      layout: matcher.layout,
      homePath: LAYOUT_HOME[matcher.layout],
      labelKey: LAYOUT_LABEL[matcher.layout],
    });
  }

  return { primaryLayout, homePath, secondaryLayouts };
}

export { modulesForLayout } from './constants/shell-nav.catalog';
