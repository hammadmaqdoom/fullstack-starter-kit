import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DevelopmentPlanActionEntity,
  DevelopmentPlanEntity,
} from '../entities/development-plan.entity';
import {
  FeedbackEntryEntity,
  RecognitionEntryEntity,
} from '../entities/feedback.entity';
import { GoalCheckInEntity } from '../entities/goal-check-in.entity';
import { ObjectiveKeyResultEntity } from '../entities/objective-key-result.entity';
import {
  OneOnOneMeetingEntity,
  OneOnOneNoteEntity,
} from '../entities/one-on-one.entity';
import { OrganizationalObjectiveEntity } from '../entities/organizational-objective.entity';
import { PerformanceCycleEntity } from '../entities/performance-cycle.entity';
import { PerformanceGoalEntity } from '../entities/performance-goal.entity';
import {
  PerformanceReviewEntity,
  PerformanceReviewPeerFeedbackEntity,
} from '../entities/performance-review.entity';
import {
  PulseSurveyEntity,
  PulseSurveyResponseEntity,
} from '../entities/pulse-survey.entity';
import { GoalStatus, ReviewStatus } from '../enums/performance.enum';
import { SeparationService } from '../separation.service';
import { TalentService } from '../talent.service';

function emptyRepository<T extends object>(): Pick<
  Repository<T>,
  'find' | 'findOne' | 'create' | 'save'
> {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((entity: any) => entity as T),
    save: jest.fn(async (entity: any) => ({
      ...entity,
      id: entity.id ?? 'generated-id',
    })),
  } as unknown as Pick<Repository<T>, 'find' | 'findOne' | 'create' | 'save'>;
}

describe('TalentService getTeamPerformanceDashboard', () => {
  let service: TalentService;
  let workerRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let goalRepository: { find: jest.Mock };
  let reviewRepository: { find: jest.Mock };
  let oneOnOneRepository: { find: jest.Mock };
  let getAuthContext: jest.Mock;

  const tenantId = DIGITARO_TENANT_ID;
  const managerWorkerId = 'manager-worker';
  const managerUserId = 'manager-user';

  beforeEach(async () => {
    workerRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({
        id: managerWorkerId,
        userId: managerUserId,
        tenantId,
      }),
    };
    goalRepository = { find: jest.fn().mockResolvedValue([]) };
    reviewRepository = { find: jest.fn().mockResolvedValue([]) };
    oneOnOneRepository = { find: jest.fn().mockResolvedValue([]) };
    getAuthContext = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentService,
        {
          provide: getRepositoryToken(OrganizationalObjectiveEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(ObjectiveKeyResultEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(PerformanceGoalEntity),
          useValue: goalRepository,
        },
        {
          provide: getRepositoryToken(GoalCheckInEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(FeedbackEntryEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(RecognitionEntryEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(OneOnOneMeetingEntity),
          useValue: oneOnOneRepository,
        },
        {
          provide: getRepositoryToken(OneOnOneNoteEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(PerformanceCycleEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(PerformanceReviewEntity),
          useValue: reviewRepository,
        },
        {
          provide: getRepositoryToken(PerformanceReviewPeerFeedbackEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(DevelopmentPlanEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(DevelopmentPlanActionEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(PulseSurveyEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(PulseSurveyResponseEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: { append: jest.fn() } },
        { provide: RbacService, useValue: { getAuthContext } },
        {
          provide: SeparationService,
          useValue: { initiateFromProbationTerminate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(TalentService);
  });

  it('forbids employees from the team dashboard', async () => {
    getAuthContext.mockResolvedValue({
      tenantId,
      userId: 'emp-user',
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [{ scopeType: ScopeType.OWN, scopeId: null }],
      broadestScope: ScopeType.OWN,
    });
    workerRepository.findOne.mockResolvedValue({
      id: 'emp-worker',
      userId: 'emp-user',
      tenantId,
    });

    await expect(
      service.getTeamPerformanceDashboard('emp-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns direct reports with goals and pending manager reviews', async () => {
    getAuthContext.mockResolvedValue({
      tenantId,
      userId: managerUserId,
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [{ scopeType: ScopeType.TEAM, scopeId: null }],
      broadestScope: ScopeType.TEAM,
    });

    const reportA = {
      id: 'w1',
      firstName: 'Emp',
      lastName: 'One',
      managerId: managerWorkerId,
      divisionId: 'div-1',
      tenantId,
      status: 'active',
    };
    const reportB = {
      id: 'w2',
      firstName: 'Emp',
      lastName: 'Two',
      managerId: managerWorkerId,
      divisionId: 'div-1',
      tenantId,
      status: 'active',
    };
    workerRepository.find.mockResolvedValue([reportA, reportB]);

    goalRepository.find.mockResolvedValue([
      {
        id: 'g1',
        workerId: 'w1',
        title: 'Goal A',
        status: GoalStatus.ACTIVE,
      },
    ]);
    reviewRepository.find.mockResolvedValue([
      {
        id: 'r1',
        workerId: 'w2',
        managerWorkerId,
        status: ReviewStatus.PENDING_MANAGER,
      },
    ]);
    oneOnOneRepository.find.mockResolvedValue([]);

    const result = await service.getTeamPerformanceDashboard(managerUserId);

    expect(result.actingWorkerId).toBe(managerWorkerId);
    expect(result.reports).toHaveLength(2);
    expect(result.reports[0]?.goals).toHaveLength(1);
    expect(result.reviewsAwaitingMe).toBe(1);
  });
});
