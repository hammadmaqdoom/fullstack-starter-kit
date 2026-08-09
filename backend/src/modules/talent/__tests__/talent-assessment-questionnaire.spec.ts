import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BadRequestException } from '@nestjs/common';
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
import { ReviewOutcome, ReviewStatus } from '../enums/performance.enum';
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

describe('TalentService assessment questionnaires', () => {
  let service: TalentService;
  let cycleRepository: jest.Mocked<
    Pick<Repository<PerformanceCycleEntity>, 'findOne' | 'create' | 'save'>
  >;
  let reviewRepository: jest.Mocked<
    Pick<Repository<PerformanceReviewEntity>, 'findOne' | 'save'>
  >;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'findOne'>
  >;
  let getAuthContext: jest.Mock;

  const tenantId = DIGITARO_TENANT_ID;
  const employeeUserId = 'emp-user';
  const employeeWorkerId = 'emp-worker';
  const reviewId = 'review-1';
  const cycleId = 'cycle-1';

  const selfTemplate = [
    {
      id: 'q1',
      type: 'long_text' as const,
      label: 'Wins',
      required: true,
    },
  ];

  beforeEach(async () => {
    cycleRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity as PerformanceCycleEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: entity.id ?? cycleId }) as PerformanceCycleEntity,
      ),
    } as unknown as typeof cycleRepository;

    reviewRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (entity) => entity as PerformanceReviewEntity),
    } as unknown as typeof reviewRepository;

    workerRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: employeeWorkerId,
        userId: employeeUserId,
        tenantId,
      } as WorkerEntity),
    } as unknown as typeof workerRepository;

    getAuthContext = jest.fn().mockResolvedValue({
      tenantId,
      userId: employeeUserId,
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [{ scopeType: ScopeType.OWN, scopeId: null }],
      broadestScope: ScopeType.OWN,
    });

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
          useValue: emptyRepository(),
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
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(OneOnOneNoteEntity),
          useValue: emptyRepository(),
        },
        {
          provide: getRepositoryToken(PerformanceCycleEntity),
          useValue: cycleRepository,
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
      ],
    }).compile();

    service = module.get(TalentService);
  });

  it('rejects self-assessment when cycle template empty', async () => {
    reviewRepository.findOne.mockResolvedValue({
      id: reviewId,
      tenantId,
      cycleId,
      workerId: employeeWorkerId,
      status: ReviewStatus.PENDING_SELF,
    } as PerformanceReviewEntity);
    cycleRepository.findOne.mockResolvedValue({
      id: cycleId,
      tenantId,
      selfAssessmentTemplate: [],
      managerAssessmentTemplate: [],
    } as PerformanceCycleEntity);

    await expect(
      service.submitSelfAssessment(
        reviewId,
        { answers: { q1: 'x' } },
        { userId: employeeUserId, tenantId },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores payload snapshot and plain-text summary', async () => {
    const review = {
      id: reviewId,
      tenantId,
      cycleId,
      workerId: employeeWorkerId,
      status: ReviewStatus.PENDING_SELF,
      competencyRatings: {},
    } as PerformanceReviewEntity;
    reviewRepository.findOne.mockResolvedValue(review);
    cycleRepository.findOne.mockResolvedValue({
      id: cycleId,
      tenantId,
      selfAssessmentTemplate: selfTemplate,
      managerAssessmentTemplate: [],
    } as PerformanceCycleEntity);

    const saved = await service.submitSelfAssessment(
      reviewId,
      { answers: { q1: 'Shipped Hub' } },
      { userId: employeeUserId, tenantId },
    );

    expect(saved.selfAssessmentPayload?.questionsSnapshot).toEqual(
      selfTemplate,
    );
    expect(saved.selfAssessmentPayload?.answers).toEqual({
      q1: 'Shipped Hub',
    });
    expect(saved.selfAssessment).toContain('Wins: Shipped Hub');
    expect(saved.status).toBe(ReviewStatus.PENDING_MANAGER);
  });

  it('does not mutate stored payload when cycle template later changes', async () => {
    const review = {
      id: reviewId,
      tenantId,
      cycleId,
      workerId: employeeWorkerId,
      status: ReviewStatus.PENDING_SELF,
      competencyRatings: {},
    } as PerformanceReviewEntity;
    reviewRepository.findOne.mockResolvedValue(review);
    const cycle = {
      id: cycleId,
      tenantId,
      selfAssessmentTemplate: [...selfTemplate],
      managerAssessmentTemplate: [],
    } as PerformanceCycleEntity;
    cycleRepository.findOne.mockResolvedValue(cycle);

    const saved = await service.submitSelfAssessment(
      reviewId,
      { answers: { q1: 'Shipped Hub' } },
      { userId: employeeUserId, tenantId },
    );

    cycle.selfAssessmentTemplate = [
      {
        id: 'q-new',
        type: 'short_text',
        label: 'New question',
        required: true,
      },
    ];

    expect(saved.selfAssessmentPayload?.questionsSnapshot).toEqual(
      selfTemplate,
    );
    expect(saved.selfAssessmentPayload?.questionsSnapshot[0].id).toBe('q1');
  });

  it('stores manager assessment payload from manager template', async () => {
    const managerUserId = 'mgr-user';
    const managerWorkerId = 'mgr-worker';
    getAuthContext.mockResolvedValue({
      tenantId,
      userId: managerUserId,
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [{ scopeType: ScopeType.TEAM, scopeId: null }],
      broadestScope: ScopeType.TEAM,
    });
    workerRepository.findOne.mockResolvedValue({
      id: managerWorkerId,
      userId: managerUserId,
      tenantId,
    } as WorkerEntity);

    const mgrTemplate = [
      {
        id: 'm1',
        type: 'long_text' as const,
        label: 'Summary',
        required: true,
      },
    ];

    reviewRepository.findOne.mockResolvedValue({
      id: reviewId,
      tenantId,
      cycleId,
      workerId: employeeWorkerId,
      managerWorkerId,
      status: ReviewStatus.PENDING_MANAGER,
      competencyRatings: {},
      cycle: {
        id: cycleId,
        peerFeedbackEnabled: false,
        calibrationEnabled: false,
        managerAssessmentTemplate: mgrTemplate,
      },
    } as PerformanceReviewEntity);

    const saved = await service.submitManagerReview(
      reviewId,
      { answers: { m1: 'Strong quarter' }, outcome: ReviewOutcome.MEETS },
      { userId: managerUserId, tenantId },
    );

    expect(saved.managerAssessmentPayload?.answers).toEqual({
      m1: 'Strong quarter',
    });
    expect(saved.managerAssessment).toContain('Summary: Strong quarter');
  });
});
