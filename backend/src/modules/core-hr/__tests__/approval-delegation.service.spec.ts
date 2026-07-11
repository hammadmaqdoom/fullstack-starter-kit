import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ApprovalDelegationService } from '@/modules/core-hr/approval-delegation.service';
import { ApprovalDelegationEntity } from '@/modules/core-hr/entities/approval-delegation.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DelegationScope } from '@/modules/core-hr/enums/delegation.enum';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

describe('ApprovalDelegationService', () => {
  let service: ApprovalDelegationService;
  let delegationRepository: jest.Mocked<
    Pick<
      Repository<ApprovalDelegationEntity>,
      'create' | 'save' | 'findOne' | 'remove' | 'createQueryBuilder'
    >
  >;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'find' | 'findOne'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;

  const delegatorId = 'w0000000-0000-4000-8000-000000000010';
  const delegateId = 'w0000000-0000-4000-8000-000000000011';

  beforeEach(async () => {
    const overlapQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    } as unknown as SelectQueryBuilder<ApprovalDelegationEntity>;

    delegationRepository = {
      create: jest.fn((entity) => entity as ApprovalDelegationEntity),
      save: jest.fn(async (entity) =>
        ({
          ...entity,
          id: 'del-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as ApprovalDelegationEntity,
      ),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(overlapQb),
    } as unknown as typeof delegationRepository;

    workerRepository = {
      find: jest.fn().mockResolvedValue([
        { id: delegatorId } as WorkerEntity,
        { id: delegateId } as WorkerEntity,
      ]),
      findOne: jest.fn(),
    };

    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalDelegationService,
        {
          provide: getRepositoryToken(ApprovalDelegationEntity),
          useValue: delegationRepository,
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
              userId: 'ops-user',
              roleCodes: [PolarisRoleCode.PEOPLE_OPS],
              assignments: [
                {
                  roleId: 'role-id',
                  roleCode: PolarisRoleCode.PEOPLE_OPS,
                  scopeType: ScopeType.ALL,
                  scopeId: null,
                },
              ],
              broadestScope: ScopeType.ALL,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ApprovalDelegationService);
  });

  it('creates delegation and writes audit log', async () => {
    const result = await service.create(
      {
        delegatorWorkerId: delegatorId,
        delegateWorkerId: delegateId,
        effectiveFrom: '2026-07-10T00:00:00.000Z',
        effectiveTo: '2026-07-20T00:00:00.000Z',
        reason: 'Annual leave',
      },
      'ops-user',
      'corr-1',
    );

    expect(result.id).toBe('del-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'approval_delegation.create',
        correlationId: 'corr-1',
      }),
    );
  });

  it('rejects self-delegation', async () => {
    await expect(
      service.create(
        {
          delegatorWorkerId: delegatorId,
          delegateWorkerId: delegatorId,
          effectiveFrom: '2026-07-10T00:00:00.000Z',
          effectiveTo: '2026-07-20T00:00:00.000Z',
        },
        'ops-user',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid date range', async () => {
    await expect(
      service.create(
        {
          delegatorWorkerId: delegatorId,
          delegateWorkerId: delegateId,
          scope: DelegationScope.APPROVALS,
          effectiveFrom: '2026-07-20T00:00:00.000Z',
          effectiveTo: '2026-07-10T00:00:00.000Z',
        },
        'ops-user',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
