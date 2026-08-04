import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ShellLayout } from '../enums/shell-layout.enum';

export type ShellModuleItem = {
  id: string;
  href: string;
  group: string;
  labelKey: string;
};

export type SecondaryLayout = {
  layout: ShellLayout;
  homePath: string;
  labelKey: string;
};

export type ShellSetup = {
  showCard: boolean;
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
  href: '/admin/setup';
};

export type ShellPayload = {
  roles: PolarisRoleCode[];
  primaryLayout: ShellLayout;
  homePath: string;
  secondaryLayouts: SecondaryLayout[];
  modules: ShellModuleItem[];
  setup: ShellSetup | null;
};

export type ShellSearchHitType =
  | 'worker'
  | 'hub_item'
  | 'policy'
  | 'action'
  | 'module';

export type ShellSearchHit = {
  type: ShellSearchHitType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};
