import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  DIGITARO_TENANT_ID,
  SYSTEM_ACTOR_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
import { PerformanceCycleType, ProbationOutcome, ReviewStatus } from '../enums/performance.enum';
import { SeparationService } from '../separation.service';
import { TalentService } from '../talent.service';
import { ReviewOutcome } from '../enums/performance.enum';

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

describe('TalentService probation auto-cycle and calibration board', () => {
  let service: TalentService;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'createQueryBuilder' | 'findOne' | 'save'>
  >;
  let cycleRepository: jest.Mocked<
    Pick<
      Repository<PerformanceCycleEntity>,
      'createQueryBuilder' | 'create' | 'save' | 'findOne'
    >
  >;
  let reviewRepository: jest.Mocked<
    Pick<
      Repository<PerformanceReviewEntity>,
      'create' | 'save' | 'find' | 'findOne'
    >
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;

  const tenantId = DIGITARO_TENANT_ID;
  const peopleOpsAuth = {
    tenantId,
    userId: 'ops-user',
    roleCodes: [PolarisRoleCode.PEOPLE_OPS],
    assignments: [],
    broadestScope: ScopeType.ALL,
  };

  beforeEach(async () => {
    const workerQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as SelectQueryBuilder<WorkerEntity>;

    workerRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(workerQb),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (entity) => entity),
    } as unknown as typeof workerRepository;

    const cycleQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    } as unknown as SelectQueryBuilder<PerformanceCycleEntity>;

    cycleRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(cycleQb),
      create: jest.fn((entity) => entity as PerformanceCycleEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: entity.id ?? 'cycle-1' }) as PerformanceCycleEntity,
      ),
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as typeof cycleRepository;

    reviewRepository = {
      create: jest.fn((entity) => entity as PerformanceReviewEntity),
      save: jest.fn(
        async (entity) =>
          ({
            ...entity,
            id: entity.id ?? 'review-1',
          }) as PerformanceReviewEntity,
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as typeof reviewRepository;

    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(peopleOpsAuth);

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
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
        {
          provide: SeparationService,
          useValue: { initiateFromProbationTerminate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(TalentService);
  });

  describe('runProbationAutoCycle', () => {
    it('creates a probation cycle and pending-self review for a worker whose probation ends in 14 days', async () => {
      const worker = {
        id: 'worker-1',
        tenantId,
        firstName: 'Amara',
        lastName: 'Khan',
        status: WorkerStatus.ACTIVE,
        startDate: '2026-04-01',
        probationEndDate: '2026-07-25',
        managerId: 'manager-1',
      } as WorkerEntity;

      (workerRepository.createQueryBuilder() as any).getMany.mockResolvedValue([
        worker,
      ]);
      (cycleRepository.createQueryBuilder() as any).getOne.mockResolvedValue(
        null,
      );

      const result = await service.runProbationAutoCycle(tenantId);

      expect(result).toEqual({ evaluated: 1, created: 1 });
      expect(cycleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cycleType: PerformanceCycleType.PROBATION,
          populationFilter: { workerId: 'worker-1' },
          createdByUserId: SYSTEM_ACTOR_ID,
        }),
      );
      expect(reviewRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId: 'worker-1',
          status: ReviewStatus.PENDING_SELF,
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cycle.probation_auto_create',
          actorId: SYSTEM_ACTOR_ID,
        }),
      );
    });

    it('is idempotent — skips workers who already have a probation cycle', async () => {
      const worker = {
        id: 'worker-1',
        tenantId,
        firstName: 'Amara',
        lastName: 'Khan',
        status: WorkerStatus.ACTIVE,
        startDate: '2026-04-01',
        probationEndDate: '2026-07-25',
        managerId: 'manager-1',
      } as WorkerEntity;

      (workerRepository.createQueryBuilder() as any).getMany.mockResolvedValue([
        worker,
      ]);
      (cycleRepository.createQueryBuilder() as any).getOne.mockResolvedValue({
        id: 'existing-cycle',
      });

      const result = await service.runProbationAutoCycle(tenantId);

      expect(result).toEqual({ evaluated: 1, created: 0 });
      expect(cycleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('calibration board', () => {
    it('denies calibration board access to roles other than People Ops / division head', async () => {
      getAuthContext.mockResolvedValue({
        ...peopleOpsAuth,
        roleCodes: [PolarisRoleCode.EMPLOYEE],
        broadestScope: ScopeType.OWN,
      });

      await expect(
        service.listCalibrationBoard('cycle-1', 'employee-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the cycle and its reviews for People Ops', async () => {
      cycleRepository.findOne.mockResolvedValue({
        id: 'cycle-1',
        tenantId,
      } as PerformanceCycleEntity);
      reviewRepository.find.mockResolvedValue([
        { id: 'review-1' } as PerformanceReviewEntity,
      ]);

      const board = await service.listCalibrationBoard('cycle-1', 'ops-user');

      expect(board.cycle.id).toBe('cycle-1');
      expect(board.reviews).toHaveLength(1);
    });

    it('rejects finalizing a review that is not pending calibration', async () => {
      reviewRepository.findOne.mockResolvedValue({
        id: 'review-1',
        tenantId,
        status: ReviewStatus.PENDING_SIGN_OFF,
      } as PerformanceReviewEntity);

      await expect(
        service.finalizeCalibration(
          'review-1',
          {},
          { userId: 'ops-user', tenantId },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('moves a pending-calibration review to pending sign-off with the calibrated outcome', async () => {
      reviewRepository.findOne.mockResolvedValue({
        id: 'review-1',
        tenantId,
        status: ReviewStatus.PENDING_CALIBRATION,
        outcome: 'meets',
        managerAssessment: 'Solid quarter.',
      } as unknown as PerformanceReviewEntity);

      const saved = await service.finalizeCalibration(
        'review-1',
        {
          calibratedOutcome: 'exceeds' as any,
          calibrationNotes: 'Adjusted up after peer comparison',
        },
        { userId: 'ops-user', tenantId },
      );

      expect(saved.status).toBe(ReviewStatus.PENDING_SIGN_OFF);
      expect(saved.outcome).toBe('exceeds');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'review.calibration_finalize' }),
      );
    });
  });

  describe('submitManagerReview gaps', () => {
    const managerAuth = {
      tenantId,
      userId: 'manager-user',
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [],
      broadestScope: ScopeType.TEAM,
    };

    it('skips pending_peer even when peer feedback is enabled (v1 manager-led)', async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      workerRepository.findOne
        .mockResolvedValueOnce({ id: 'manager-1' } as WorkerEntity)
        .mockResolvedValueOnce({
          id: 'worker-1',
          tenantId,
          probationEndDate: '2026-09-01',
        } as WorkerEntity);

      reviewRepository.findOne.mockResolvedValue({
        id: 'review-1',
        tenantId,
        workerId: 'worker-1',
        managerWorkerId: 'manager-1',
        status: ReviewStatus.PENDING_MANAGER,
        cycle: {
          peerFeedbackEnabled: true,
          calibrationEnabled: false,
          cycleType: PerformanceCycleType.ANNUAL,
          managerAssessmentTemplate: [
            {
              id: 'q1',
              type: 'short_text',
              label: 'Summary',
              required: true,
            },
          ],
        },
      } as unknown as PerformanceReviewEntity);

      const saved = await service.submitManagerReview(
        'review-1',
        {
          answers: { q1: 'Good work' },
          outcome: ReviewOutcome.MEETS,
        },
        { userId: 'manager-user', tenantId },
      );

      expect(saved.status).toBe(ReviewStatus.PENDING_SIGN_OFF);
    });

    it('clears probation end date and queues confirmation letter on confirm', async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      const worker = {
        id: 'worker-1',
        tenantId,
        probationEndDate: '2026-09-01',
      } as WorkerEntity;
      workerRepository.findOne
        .mockResolvedValueOnce({ id: 'manager-1' } as WorkerEntity)
        .mockResolvedValueOnce(worker);

      reviewRepository.findOne.mockResolvedValue({
        id: 'review-1',
        tenantId,
        workerId: 'worker-1',
        managerWorkerId: 'manager-1',
        status: ReviewStatus.PENDING_MANAGER,
        cycle: {
          peerFeedbackEnabled: false,
          calibrationEnabled: false,
          cycleType: PerformanceCycleType.PROBATION,
          managerAssessmentTemplate: [
            {
              id: 'q1',
              type: 'short_text',
              label: 'Summary',
              required: true,
            },
          ],
        },
      } as unknown as PerformanceReviewEntity);

      const saved = await service.submitManagerReview(
        'review-1',
        {
          answers: { q1: 'Confirmed' },
          outcome: ReviewOutcome.MEETS,
          probationOutcome: ProbationOutcome.CONFIRM,
        },
        { userId: 'manager-user', tenantId },
      );

      expect(workerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'worker-1', probationEndDate: null }),
      );
      expect(saved.outcomeLetterStatus).toBe('pending_template');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'review.probation_confirm' }),
      );
    });

    it('extends probation end date on extend outcome', async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      const worker = {
        id: 'worker-1',
        tenantId,
        probationEndDate: '2026-09-01',
      } as WorkerEntity;
      workerRepository.findOne
        .mockResolvedValueOnce({ id: 'manager-1' } as WorkerEntity)
        .mockResolvedValueOnce(worker);

      reviewRepository.findOne.mockResolvedValue({
        id: 'review-1',
        tenantId,
        workerId: 'worker-1',
        managerWorkerId: 'manager-1',
        status: ReviewStatus.PENDING_MANAGER,
        cycle: {
          peerFeedbackEnabled: false,
          calibrationEnabled: false,
          cycleType: PerformanceCycleType.PROBATION,
          managerAssessmentTemplate: [
            {
              id: 'q1',
              type: 'short_text',
              label: 'Summary',
              required: true,
            },
          ],
        },
      } as unknown as PerformanceReviewEntity);

      await service.submitManagerReview(
        'review-1',
        {
          answers: { q1: 'Extend' },
          outcome: ReviewOutcome.MEETS,
          probationOutcome: ProbationOutcome.EXTEND,
          probationExtensionDays: 30,
        },
        { userId: 'manager-user', tenantId },
      );

      expect(workerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'worker-1',
          probationEndDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'review.probation_extend' }),
      );
    });
  });
});
