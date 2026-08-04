import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { SETUP_WIZARD_STEP_ORDER } from '@/modules/country-config/enums/setup-wizard.enum';
import { SetupWizardService } from '@/modules/country-config/setup-wizard.service';
import { Injectable } from '@nestjs/common';
import { modulesForLayout } from './constants/shell-nav.catalog';
import { resolveShellLayout } from './shell-layout.util';
import { ShellPayload, ShellSetup } from './types/shell.type';

const SETUP_ROLES = new Set<string>([
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
  PolarisRoleCode.IT_ADMIN,
  PolarisRoleCode.HRBP,
]);

@Injectable()
export class ShellService {
  constructor(
    private readonly rbacService: RbacService,
    private readonly setupWizardService: SetupWizardService,
  ) {}

  async getShell(
    userId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ShellPayload> {
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    const { primaryLayout, homePath, secondaryLayouts } = resolveShellLayout(
      auth.roleCodes,
    );
    const modules = modulesForLayout(primaryLayout);

    const canSetup = auth.roleCodes.some((code) =>
      SETUP_ROLES.has(code.toLowerCase()),
    );

    let setup: ShellSetup | null = null;
    if (canSetup) {
      const state = await this.setupWizardService.getState(tenantId);
      const totalSteps = SETUP_WIZARD_STEP_ORDER.length;
      const completedSteps = state.steps.filter(
        (step) => step.isComplete || step.isSkipped,
      ).length;
      setup = {
        showCard: !state.progress.isComplete,
        completedSteps,
        totalSteps,
        isComplete: state.progress.isComplete,
        href: '/admin/setup',
      };
    }

    return {
      roles: auth.roleCodes as PolarisRoleCode[],
      primaryLayout,
      homePath,
      secondaryLayouts,
      modules,
      setup,
    };
  }
}
