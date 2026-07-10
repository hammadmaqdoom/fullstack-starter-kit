import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ProfileChangeRequestEntity } from '@/modules/core-hr/entities/profile-change-request.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ApprovalStatus } from '@/modules/core-hr/enums/org.enum';
import { PolicyService } from '@/modules/documents/policy.service';
import {
  DevelopmentActionStatus,
  OneOnOneStatus,
  ReviewStatus,
} from '@/modules/talent/enums/performance.enum';
import { LeaveRequestStatus } from '@/modules/time-leave/enums/leave.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HubSavedViewEntity } from '../entities/hub-saved-view.entity';
import { HubService } from '../hub.service';

describe('HubService', () => {
  let service: HubService;
  let profileChangeRepository: jest.Mocked<
    Pick<Repository<ProfileChangeRequestEntity>, 'find'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let savedViewRepository: jest.Mocked<
    Pick<Repository<HubSavedViewEntity>, 'find' | 'create' | 'save'>
  >;
  let dataSource: { query: jest.Mock };
  let policyService: {
    getPendingAcknowledgements: jest.Mock;
  };

  const workerId = 'w0000000-0000-4000-8000-000000000010';
  const userId = 'u0000000-0000-4000-8000-000000000010';

  beforeEach(async () => {
    profileChangeRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'pcr-1',
          tenantId: DIGITARO_TENANT_ID,
          workerId,
          status: ApprovalStatus.SUBMITTED,
          createdAt: new Date('2026-07-01T10:00:00Z'),
        } as ProfileChangeRequestEntity,
      ]),
    };
    workerRepository = {
      findOne: jest.fn().mockResolvedValue({ id: workerId } as WorkerEntity),
    };
    savedViewRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((e) => e as HubSavedViewEntity),
      save: jest.fn(
        async (e) => ({ ...e, id: 'view-1' }) as HubSavedViewEntity,
      ),
    } as unknown as typeof savedViewRepository;
    dataSource = {
      query: jest.fn().mockResolvedValue([]),
    };
    policyService = {
      getPendingAcknowledgements: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubService,
        {
          provide: getRepositoryToken(HubSavedViewEntity),
          useValue: savedViewRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        {
          provide: getRepositoryToken(ProfileChangeRequestEntity),
          useValue: profileChangeRepository,
        },
        {
          provide: RbacService,
          useValue: {
            getAuthContext: jest.fn().mockResolvedValue({
              tenantId: DIGITARO_TENANT_ID,
              userId,
              roleCodes: [PolarisRoleCode.MANAGER],
              assignments: [
                {
                  roleId: 'role-1',
                  roleCode: PolarisRoleCode.MANAGER,
                  scopeType: ScopeType.TEAM,
                  scopeId: null,
                },
              ],
              broadestScope: ScopeType.TEAM,
            }),
          },
        },
        { provide: DataSource, useValue: dataSource },
        { provide: PolicyService, useValue: policyService },
      ],
    }).compile();

    service = module.get(HubService);
  });

  it('returns HubItem shape with mine and forMe buckets', async () => {
    profileChangeRepository
      .find!.mockResolvedValueOnce([
        {
          id: 'pcr-mine',
          tenantId: DIGITARO_TENANT_ID,
          workerId,
          status: ApprovalStatus.SUBMITTED,
          createdAt: new Date('2026-07-01T10:00:00Z'),
        } as ProfileChangeRequestEntity,
      ])
      .mockResolvedValueOnce([
        {
          id: 'pcr-other',
          tenantId: DIGITARO_TENANT_ID,
          workerId: 'other-worker',
          status: ApprovalStatus.SUBMITTED,
          createdAt: new Date('2026-07-02T10:00:00Z'),
        } as ProfileChangeRequestEntity,
      ]);

    const result = await service.getInbox(userId, {});

    expect(result.data).toEqual(
      expect.objectContaining({
        mine: expect.any(Array),
        forMe: expect.any(Array),
      }),
    );

    const sample = result.data.mine[0] ?? result.data.forMe[0];
    expect(sample).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: expect.any(String),
        title: expect.any(String),
        status: expect.any(String),
        createdAt: expect.any(Date),
        href: expect.any(String),
        entityId: expect.any(String),
      }),
    );
    expect(result.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('filters to mine tab only', async () => {
    profileChangeRepository
      .find!.mockResolvedValueOnce([
        {
          id: 'pcr-mine',
          tenantId: DIGITARO_TENANT_ID,
          workerId,
          status: ApprovalStatus.SUBMITTED,
          createdAt: new Date(),
        } as ProfileChangeRequestEntity,
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getInbox(userId, { tab: 'mine' });

    expect(result.data.forMe).toEqual([]);
    expect(result.data.mine.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty arrays when optional sources fail', async () => {
    profileChangeRepository.find!.mockRejectedValue(
      new Error('relation missing'),
    );
    dataSource.query.mockRejectedValue(new Error('relation missing'));

    const result = await service.getInbox(userId, {});

    expect(result.data.mine).toEqual([]);
    expect(result.data.forMe).toEqual([]);
  });

  it('creates saved views', async () => {
    const view = await service.createView(userId, {
      name: 'Pending',
      filters: { type: 'profile_change_request' },
    });

    expect(view.id).toBe('view-1');
    expect(savedViewRepository.save).toHaveBeenCalled();
  });

  it('aggregates leave requests and pending policy acknowledgements into mine', async () => {
    profileChangeRepository.find!.mockResolvedValue([]);
    dataSource.query.mockImplementation(async (sql: string) => {
      if (
        sql.includes('FROM leave_requests') &&
        sql.includes('"workerId" = $2')
      ) {
        return [
          {
            id: 'leave-1',
            status: LeaveRequestStatus.SUBMITTED,
            createdAt: new Date('2026-07-03T10:00:00Z'),
            startDate: '2026-07-10',
            endDate: '2026-07-12',
          },
        ];
      }
      return [];
    });
    policyService.getPendingAcknowledgements.mockResolvedValue([
      {
        policyVersionId: 'pv-1',
        policyTitle: 'Code of Conduct',
        effectiveFrom: '2026-01-01',
      },
    ]);

    const result = await service.getInbox(userId, { tab: 'mine' });

    expect(result.data.mine.map((i) => i.type)).toEqual(
      expect.arrayContaining(['leave_request', 'policy_acknowledgement']),
    );
    expect(policyService.getPendingAcknowledgements).toHaveBeenCalledWith(
      userId,
      DIGITARO_TENANT_ID,
    );
  });

  it('aggregates pending performance reviews, upcoming 1:1s, and IDP actions', async () => {
    profileChangeRepository.find!.mockResolvedValue([]);
    dataSource.query.mockImplementation(async (sql: string) => {
      if (
        sql.includes('FROM performance_reviews') &&
        sql.includes('"workerId" = $2')
      ) {
        return [
          {
            id: 'review-1',
            status: ReviewStatus.PENDING_SELF,
            createdAt: new Date('2026-07-01T10:00:00Z'),
          },
        ];
      }
      if (
        sql.includes('FROM one_on_one_meetings') &&
        sql.includes('"employeeWorkerId" = $2')
      ) {
        return [
          {
            id: 'meeting-1',
            status: OneOnOneStatus.SCHEDULED,
            scheduledAt: new Date('2026-07-15T10:00:00Z'),
            managerFirstName: 'Sam',
            managerLastName: 'Lee',
          },
        ];
      }
      if (
        sql.includes('FROM development_plan_actions') &&
        sql.includes('p."workerId" = $2')
      ) {
        return [
          {
            id: 'action-1',
            title: 'Complete leadership course',
            status: DevelopmentActionStatus.PENDING,
            createdAt: new Date('2026-07-02T10:00:00Z'),
          },
        ];
      }
      return [];
    });

    const result = await service.getInbox(userId, { tab: 'mine' });

    expect(result.data.mine.map((i) => i.type)).toEqual(
      expect.arrayContaining([
        'performance_review',
        'one_on_one',
        'development_plan_action',
      ]),
    );
    const review = result.data.mine.find(
      (i) => i.type === 'performance_review',
    );
    expect(review?.title).toBe('Self-assessment due');
    const meeting = result.data.mine.find((i) => i.type === 'one_on_one');
    expect(meeting?.title).toBe('Upcoming 1:1 with Sam Lee');
  });

  it('surfaces manager-facing review, 1:1, and IDP items in forMe', async () => {
    profileChangeRepository.find!.mockResolvedValue([]);
    dataSource.query.mockImplementation(async (sql: string) => {
      if (
        sql.includes('FROM performance_reviews') &&
        sql.includes('"managerWorkerId" = $2')
      ) {
        return [
          {
            id: 'review-2',
            status: ReviewStatus.PENDING_MANAGER,
            createdAt: new Date('2026-07-03T10:00:00Z'),
          },
        ];
      }
      if (
        sql.includes('FROM one_on_one_meetings') &&
        sql.includes('"managerWorkerId" = $2')
      ) {
        return [
          {
            id: 'meeting-2',
            status: OneOnOneStatus.SCHEDULED,
            scheduledAt: new Date('2026-07-16T10:00:00Z'),
            employeeFirstName: 'Priya',
            employeeLastName: 'Rao',
          },
        ];
      }
      if (
        sql.includes('FROM development_plan_actions') &&
        sql.includes('w."managerId" = $2')
      ) {
        return [
          {
            id: 'action-2',
            title: 'Shadow a client call',
            status: DevelopmentActionStatus.PENDING,
            createdAt: new Date('2026-07-04T10:00:00Z'),
            workerFirstName: 'Priya',
            workerLastName: 'Rao',
          },
        ];
      }
      return [];
    });

    const result = await service.getInbox(userId, { tab: 'for_me' });

    expect(result.data.forMe.map((i) => i.type)).toEqual(
      expect.arrayContaining([
        'performance_review',
        'one_on_one',
        'development_plan_action',
      ]),
    );
    const action = result.data.forMe.find(
      (i) => i.type === 'development_plan_action',
    );
    expect(action?.title).toBe('Shadow a client call (Priya Rao)');
  });
});
