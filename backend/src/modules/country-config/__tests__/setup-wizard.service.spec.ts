import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DataSource } from 'typeorm';
import { SetupWizardStep } from '@/modules/country-config/enums/setup-wizard.enum';
import { SetupWizardService } from '@/modules/country-config/setup-wizard.service';

describe('SetupWizardService', () => {
  let service: SetupWizardService;
  let progressRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let auditLogService: { append: jest.Mock };

  beforeEach(() => {
    progressRepository = {
      findOne: jest.fn(),
      create: jest.fn((input) => ({ id: 'progress-1', ...input })),
      save: jest.fn(async (input) => input),
    };
    auditLogService = { append: jest.fn() };

    const dataSource = {
      transaction: jest.fn(async (cb) =>
        cb({
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn((_, input) => input),
          save: jest.fn(async (input) => ({ id: 'seed-1', ...input })),
        }),
      ),
    } as unknown as DataSource;

    service = new SetupWizardService(
      dataSource,
      auditLogService as unknown as AuditLogService,
      progressRepository as never,
      { update: jest.fn() } as never,
      { count: jest.fn().mockResolvedValue(0) } as never,
      { count: jest.fn().mockResolvedValue(0) } as never,
      { count: jest.fn().mockResolvedValue(0) } as never,
      { count: jest.fn().mockResolvedValue(0) } as never,
      { count: jest.fn().mockResolvedValue(0) } as never,
      { count: jest.fn().mockResolvedValue(0) } as never,
      { count: jest.fn().mockResolvedValue(3) } as never,
      { count: jest.fn().mockResolvedValue(3) } as never,
    );
  });

  it('creates default progress when none exists', async () => {
    progressRepository.findOne.mockResolvedValue(null);

    const state = await service.getState(DIGITARO_TENANT_ID);

    expect(progressRepository.create).toHaveBeenCalled();
    expect(state.steps).toHaveLength(10);
    expect(state.steps[0]?.step).toBe(SetupWizardStep.ORGANISATION);
  });

  it('marks step complete and writes audit log', async () => {
    progressRepository.findOne.mockResolvedValue({
      id: 'progress-1',
      tenantId: DIGITARO_TENANT_ID,
      currentStep: SetupWizardStep.ORGANISATION,
      completedSteps: [],
      skippedSteps: [],
      stepData: {},
      isComplete: false,
    });

    await service.saveStep(
      {
        step: SetupWizardStep.ORGANISATION,
        data: { organisationName: 'Digitaro' },
      },
      'actor-1',
      DIGITARO_TENANT_ID,
    );

    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'setup_wizard.step_saved',
        actorId: 'actor-1',
      }),
    );
    expect(progressRepository.save).toHaveBeenCalled();
  });
});
