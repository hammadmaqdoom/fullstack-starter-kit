import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { SETUP_WIZARD_STEP_ORDER } from '@/modules/country-config/enums/setup-wizard.enum';
import { SetupWizardService } from '@/modules/country-config/setup-wizard.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ShellLayout } from '../enums/shell-layout.enum';
import { ShellService } from '../shell.service';

function authContext(
  roleCodes: PolarisRoleCode[],
  userId = 'u1',
): PolarisAuthContext {
  return {
    tenantId: DIGITARO_TENANT_ID,
    userId,
    roleCodes,
    assignments: [],
    broadestScope: ScopeType.OWN,
  };
}

describe('ShellService.getShell', () => {
  let service: ShellService;
  let rbac: { getAuthContext: jest.Mock };
  let setupWizard: { getState: jest.Mock };

  beforeEach(async () => {
    rbac = { getAuthContext: jest.fn() };
    setupWizard = { getState: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShellService,
        { provide: RbacService, useValue: rbac },
        { provide: SetupWizardService, useValue: setupWizard },
      ],
    }).compile();

    service = module.get(ShellService);
  });

  it('returns employee modules and null setup for employee-only', async () => {
    rbac.getAuthContext.mockResolvedValue(
      authContext([PolarisRoleCode.EMPLOYEE]),
    );

    const shell = await service.getShell('u1');

    expect(shell.setup).toBeNull();
    expect(shell.primaryLayout).toBe(ShellLayout.EMPLOYEE);
    expect(shell.modules.every((m) => m.href.startsWith('/'))).toBe(true);
    expect(setupWizard.getState).not.toHaveBeenCalled();
  });

  it('attaches setup card when people_ops and wizard incomplete', async () => {
    rbac.getAuthContext.mockResolvedValue(
      authContext([PolarisRoleCode.PEOPLE_OPS]),
    );
    setupWizard.getState.mockResolvedValue({
      progress: {
        completedSteps: ['organisation', 'legal_entities'],
        skippedSteps: [],
        isComplete: false,
      },
      steps: Array.from({ length: SETUP_WIZARD_STEP_ORDER.length }, (_, i) => ({
        isComplete: i < 2,
        isSkipped: false,
      })),
      summary: {},
    });

    const shell = await service.getShell('u1');

    expect(shell.setup).toEqual({
      showCard: true,
      completedSteps: 2,
      totalSteps: SETUP_WIZARD_STEP_ORDER.length,
      isComplete: false,
      href: '/admin/setup',
    });
    expect(shell.modules.some((m) => m.id === 'setup')).toBe(true);
  });

  it('hides setup card when wizard complete but keeps setup module', async () => {
    rbac.getAuthContext.mockResolvedValue(
      authContext([PolarisRoleCode.PEOPLE_OPS]),
    );
    setupWizard.getState.mockResolvedValue({
      progress: {
        completedSteps: [...SETUP_WIZARD_STEP_ORDER],
        skippedSteps: [],
        isComplete: true,
      },
      steps: Array.from({ length: SETUP_WIZARD_STEP_ORDER.length }, () => ({
        isComplete: true,
        isSkipped: false,
      })),
      summary: {},
    });

    const shell = await service.getShell('u1');

    expect(shell.setup?.showCard).toBe(false);
    expect(shell.setup?.isComplete).toBe(true);
    expect(shell.modules.some((m) => m.id === 'setup')).toBe(true);
  });
});
