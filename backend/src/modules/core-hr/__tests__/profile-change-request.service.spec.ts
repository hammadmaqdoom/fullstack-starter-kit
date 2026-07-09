import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ProfileChangeRequestEntity } from '@/modules/core-hr/entities/profile-change-request.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ApprovalStatus } from '@/modules/core-hr/enums/org.enum';
import { ProfileChangeRequestService } from '@/modules/core-hr/profile-change-request.service';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('ProfileChangeRequestService', () => {
  let service: ProfileChangeRequestService;
  let requestRepository: jest.Mocked<
    Pick<Repository<ProfileChangeRequestEntity>, 'create' | 'save' | 'find' | 'findOne'>
  >;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'findOne' | 'save'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;

  const worker = {
    id: 'worker-1',
    tenantId: DIGITARO_TENANT_ID,
    phone: '+92000000001',
    deletedAt: null,
  } as WorkerEntity;

  beforeEach(async () => {
    requestRepository = {
      create: jest.fn((entity) => entity as ProfileChangeRequestEntity),
      save: jest.fn(async (entity) =>
        ({
          ...entity,
          id: 'request-1',
          createdAt: new Date(),
        }) as ProfileChangeRequestEntity,
      ),
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as typeof requestRepository;
    workerRepository = {
      findOne: jest.fn().mockResolvedValue(worker),
      save: jest.fn(async (entity) => entity as WorkerEntity),
    } as unknown as typeof workerRepository;
    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileChangeRequestService,
        {
          provide: getRepositoryToken(ProfileChangeRequestEntity),
          useValue: requestRepository,
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
              tenantId: DIGITARO_TENANT_ID,
              userId: 'employee-user-id',
              roleCodes: [PolarisRoleCode.EMPLOYEE],
              assignments: [
                {
                  roleId: 'role-id',
                  roleCode: PolarisRoleCode.EMPLOYEE,
                  scopeType: ScopeType.OWN,
                  scopeId: null,
                },
              ],
              broadestScope: ScopeType.OWN,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ProfileChangeRequestService);
  });

  it('submits employee-editable change request with audit log', async () => {
    const result = await service.submit(
      worker.id,
      { fieldChanges: { phone: { old: '+92000000001', new: '+92000000099' } } },
      'employee-user-id',
    );

    expect(result.status).toBe(ApprovalStatus.SUBMITTED);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'profile_change_request.submit' }),
    );
  });

  it('blocks non-editable fields for employees', async () => {
    await expect(
      service.submit(
        worker.id,
        {
          fieldChanges: {
            compensationBand: { old: null, new: { baseSalary: 1 } },
          },
        },
        'employee-user-id',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
