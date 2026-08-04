import { apiRequest } from '@/libs/api/client';

export type ShellLayout =
  | 'employee'
  | 'manager'
  | 'people_ops'
  | 'finance'
  | 'contractor'
  | 'admin';

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
  roles: string[];
  primaryLayout: ShellLayout;
  homePath: string;
  secondaryLayouts: SecondaryLayout[];
  modules: ShellModuleItem[];
  setup: ShellSetup | null;
};

export type ShellSearchHit = {
  type: 'worker' | 'hub_item' | 'policy' | 'action' | 'module';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function getShell() {
  return apiRequest<ShellPayload>('/api/v1/me/shell');
}

export function searchShell(q: string, limit = 20) {
  return apiRequest<ShellSearchHit[]>('/api/v1/me/search', {
    params: { q, limit },
  });
}
