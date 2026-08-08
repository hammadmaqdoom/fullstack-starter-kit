import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { EntraStatus } from '@/modules/core-hr/enums/worker.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntraProvisioningJobEntity } from '../entities/entra-provisioning-job.entity';
import { EntraProvisioningService } from '../entra-provisioning.service';
import { EntraProvisioningJobStatus } from '../enums/onboarding.enum';
import { MICROSOFT_GRAPH_IDENTITY } from '../interfaces/microsoft-graph-identity.interface';

describe('EntraProvisioningService', () => {
  let service: EntraProvisioningService;
  let jobRepository: jest.Mocked<
    Pick<
      Repository<EntraProvisioningJobEntity>,
      'save' | 'create' | 'findOne' | 'findOneOrFail' | 'find'
    >
  >;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'findOne' | 'save' | 'findOneOrFail'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let graph: {
    isConfigured: jest.Mock;
    createOrEnableUser: jest.Mock;
    disableUser: jest.Mock;
  };

  const workerId = 'w0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    jobRepository = {
      save: jest.fn(async (e) => ({
        ...(e as object),
        id: 'job-1',
      })) as never,
      create: jest.fn((e) => e as EntraProvisioningJobEntity) as never,
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      find: jest.fn(),
    };
    workerRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: workerId,
        tenantId: DIGITARO_TENANT_ID,
        email: 'jane@digitaro.com',
        firstName: 'Jane',
        lastName: 'Doe',
        entraStatus: EntraStatus.PENDING,
        entraObjectId: null,
      }),
      save: jest.fn(async (e) => e) as never,
      findOneOrFail: jest.fn(),
    };
    auditLogService = { append: jest.fn() };
    graph = {
      isConfigured: jest.fn().mockReturnValue(false),
      createOrEnableUser: jest.fn().mockResolvedValue({
        success: false,
        entraObjectId: null,
        reason: 'not_configured',
      }),
      disableUser: jest.fn().mockResolvedValue({
        success: false,
        reason: 'not_configured',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntraProvisioningService,
        {
          provide: getRepositoryToken(EntraProvisioningJobEntity),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: RbacService,
          useValue: {
            getAuthContext: jest.fn().mockResolvedValue({
              roleCodes: [PolarisRoleCode.IT_ADMIN],
              assignments: [],
              broadestScope: ScopeType.ALL,
            }),
          },
        },
        { provide: MICROSOFT_GRAPH_IDENTITY, useValue: graph },
      ],
    }).compile();

    service = module.get(EntraProvisioningService);
  });

  it('schedules provision job and stubs Graph call', async () => {
    jobRepository.findOneOrFail!.mockResolvedValue({
      id: 'job-1',
      status: EntraProvisioningJobStatus.FAILED,
      lastError: 'not_configured',
    } as EntraProvisioningJobEntity);

    const job = await service.scheduleProvision(workerId, '2026-08-01', {
      userId: 'ops',
    });

    expect(job?.id).toBe('job-1');
    expect(graph.createOrEnableUser).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'entra.provision.schedule' }),
    );
  });

  it('skips contractors with entra not_required', async () => {
    workerRepository.findOne!.mockResolvedValue({
      id: workerId,
      entraStatus: EntraStatus.NOT_REQUIRED,
    } as WorkerEntity);

    const job = await service.scheduleProvision(workerId, '2026-08-01');

    expect(job).toBeNull();
    expect(jobRepository.save).not.toHaveBeenCalled();
  });

  it('disableAccount stubs Graph and audits', async () => {
    const result = await service.disableAccount(workerId, { userId: 'ops' });

    expect(result.reason).toBe('not_configured');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'entra.account.disable' }),
    );
  });
});
