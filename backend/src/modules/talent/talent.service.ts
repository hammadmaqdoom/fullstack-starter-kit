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
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CreateDevelopmentActionDto,
  CreateDevelopmentPlanDto,
  CreateFeedbackDto,
  CreateGoalCheckInDto,
  CreateGoalDto,
  CreateKeyResultDto,
  CreateObjectiveDto,
  CreateOneOnOneDto,
  CreateOneOnOneNoteDto,
  CreatePerformanceCycleDto,
  CreatePulseSurveyDto,
  CreateRecognitionDto,
  FinalizeCalibrationDto,
  SubmitManagerReviewDto,
  SubmitPeerFeedbackDto,
  SubmitPulseResponseDto,
  SubmitSelfAssessmentDto,
  UpdateDevelopmentActionDto,
  UpdateDevelopmentPlanDto,
  UpdateGoalDto,
  UpdateKeyResultDto,
  UpdateObjectiveDto,
  UpdateOneOnOneDto,
  UpdatePerformanceCycleDto,
  UpdatePulseSurveyDto,
} from './dto/talent.dto';
import {
  DevelopmentPlanActionEntity,
  DevelopmentPlanEntity,
} from './entities/development-plan.entity';
import {
  FeedbackEntryEntity,
  RecognitionEntryEntity,
} from './entities/feedback.entity';
import { GoalCheckInEntity } from './entities/goal-check-in.entity';
import { ObjectiveKeyResultEntity } from './entities/objective-key-result.entity';
import {
  OneOnOneMeetingEntity,
  OneOnOneNoteEntity,
} from './entities/one-on-one.entity';
import { OrganizationalObjectiveEntity } from './entities/organizational-objective.entity';
import { PerformanceCycleEntity } from './entities/performance-cycle.entity';
import { PerformanceGoalEntity } from './entities/performance-goal.entity';
import {
  PerformanceReviewEntity,
  PerformanceReviewPeerFeedbackEntity,
} from './entities/performance-review.entity';
import {
  PulseSurveyEntity,
  PulseSurveyResponseEntity,
} from './entities/pulse-survey.entity';
import {
  DevelopmentPlanStatus,
  GoalStatus,
  ObjectiveStatus,
  OneOnOneStatus,
  PerformanceCycleStatus,
  PerformanceCycleType,
  PulseSurveyStatus,
  ReviewStatus,
} from './enums/performance.enum';
import {
  countReviewsAwaitingMe,
  workerDisplayName,
} from './performance-dashboard.util';
import {
  assertWorkerPerformanceAccess,
  isPeopleOpsOrAdmin,
} from './talent-scope.util';

type ActorContext = {
  userId: string;
  tenantId: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class TalentService {
  constructor(
    @InjectRepository(OrganizationalObjectiveEntity)
    private readonly objectiveRepository: Repository<OrganizationalObjectiveEntity>,
    @InjectRepository(ObjectiveKeyResultEntity)
    private readonly keyResultRepository: Repository<ObjectiveKeyResultEntity>,
    @InjectRepository(PerformanceGoalEntity)
    private readonly goalRepository: Repository<PerformanceGoalEntity>,
    @InjectRepository(GoalCheckInEntity)
    private readonly checkInRepository: Repository<GoalCheckInEntity>,
    @InjectRepository(FeedbackEntryEntity)
    private readonly feedbackRepository: Repository<FeedbackEntryEntity>,
    @InjectRepository(RecognitionEntryEntity)
    private readonly recognitionRepository: Repository<RecognitionEntryEntity>,
    @InjectRepository(OneOnOneMeetingEntity)
    private readonly oneOnOneRepository: Repository<OneOnOneMeetingEntity>,
    @InjectRepository(OneOnOneNoteEntity)
    private readonly oneOnOneNoteRepository: Repository<OneOnOneNoteEntity>,
    @InjectRepository(PerformanceCycleEntity)
    private readonly cycleRepository: Repository<PerformanceCycleEntity>,
    @InjectRepository(PerformanceReviewEntity)
    private readonly reviewRepository: Repository<PerformanceReviewEntity>,
    @InjectRepository(PerformanceReviewPeerFeedbackEntity)
    private readonly peerFeedbackRepository: Repository<PerformanceReviewPeerFeedbackEntity>,
    @InjectRepository(DevelopmentPlanEntity)
    private readonly developmentPlanRepository: Repository<DevelopmentPlanEntity>,
    @InjectRepository(DevelopmentPlanActionEntity)
    private readonly developmentActionRepository: Repository<DevelopmentPlanActionEntity>,
    @InjectRepository(PulseSurveyEntity)
    private readonly pulseSurveyRepository: Repository<PulseSurveyEntity>,
    @InjectRepository(PulseSurveyResponseEntity)
    private readonly pulseResponseRepository: Repository<PulseSurveyResponseEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  private async getContext(userId: string, tenantId = DIGITARO_TENANT_ID) {
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      userId,
      tenantId,
    );
    return { auth, actingWorkerId, tenantId };
  }

  private async getWorkerOrFail(
    workerId: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }
    return worker;
  }

  private async audit(
    actor: ActorContext,
    action: string,
    entityType: string,
    entityId: string,
    fields: Record<string, unknown>,
  ) {
    const changes = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        { old: null, new: value },
      ]),
    );
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action,
      entityType,
      entityId,
      changes,
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  // --- Objectives (OKRs) ---

  async listObjectives(userId: string) {
    const { tenantId } = await this.getContext(userId);
    return this.objectiveRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      relations: ['division', 'department'],
    });
  }

  async createObjective(dto: CreateObjectiveDto, actor: ActorContext) {
    const { auth } = await this.getContext(actor.userId, actor.tenantId);
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'OBJECTIVE_CREATE_DENIED',
        message: 'Only People Ops or Division Head can create objectives',
      });
    }

    const objective = await this.objectiveRepository.save(
      this.objectiveRepository.create({
        tenantId: actor.tenantId,
        level: dto.level,
        divisionId: dto.divisionId ?? null,
        departmentId: dto.departmentId ?? null,
        title: dto.title,
        description: dto.description ?? null,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        status: ObjectiveStatus.DRAFT,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(
      actor,
      'objective.create',
      'organizational_objective',
      objective.id,
      {
        title: objective.title,
        level: objective.level,
      },
    );

    return objective;
  }

  async updateObjective(
    id: string,
    dto: UpdateObjectiveDto,
    actor: ActorContext,
  ) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'OBJECTIVE_UPDATE_DENIED',
        message: 'Access denied',
      });
    }

    const objective = await this.objectiveRepository.findOne({
      where: { id, tenantId },
    });
    if (!objective) {
      throw new NotFoundException({
        code: 'OBJECTIVE_NOT_FOUND',
        message: 'Objective not found',
      });
    }

    Object.assign(objective, dto);
    const saved = await this.objectiveRepository.save(objective);
    await this.audit(
      actor,
      'objective.update',
      'organizational_objective',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  async listKeyResults(objectiveId: string, userId: string) {
    const { tenantId } = await this.getContext(userId);
    return this.keyResultRepository.find({
      where: { tenantId, objectiveId },
      order: { createdAt: 'ASC' },
    });
  }

  async createKeyResult(
    objectiveId: string,
    dto: CreateKeyResultDto,
    actor: ActorContext,
  ) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'KEY_RESULT_CREATE_DENIED',
        message: 'Access denied',
      });
    }

    const objective = await this.objectiveRepository.findOne({
      where: { id: objectiveId, tenantId },
    });
    if (!objective) {
      throw new NotFoundException({
        code: 'OBJECTIVE_NOT_FOUND',
        message: 'Objective not found',
      });
    }

    const keyResult = await this.keyResultRepository.save(
      this.keyResultRepository.create({
        tenantId,
        objectiveId,
        title: dto.title,
        description: dto.description ?? null,
        targetValue: dto.targetValue != null ? String(dto.targetValue) : null,
        unit: dto.unit ?? null,
        weightPercent: dto.weightPercent ?? 0,
      }),
    );

    await this.audit(
      actor,
      'key_result.create',
      'objective_key_result',
      keyResult.id,
      {
        objectiveId,
        title: keyResult.title,
      },
    );

    return keyResult;
  }

  async updateKeyResult(
    id: string,
    dto: UpdateKeyResultDto,
    actor: ActorContext,
  ) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'KEY_RESULT_UPDATE_DENIED',
        message: 'Access denied',
      });
    }

    const keyResult = await this.keyResultRepository.findOne({
      where: { id, tenantId },
    });
    if (!keyResult) {
      throw new NotFoundException({
        code: 'KEY_RESULT_NOT_FOUND',
        message: 'Key result not found',
      });
    }

    if (dto.currentValue != null) {
      keyResult.currentValue = String(dto.currentValue);
    }
    if (dto.title != null) keyResult.title = dto.title;
    if (dto.status != null) keyResult.status = dto.status;

    const saved = await this.keyResultRepository.save(keyResult);
    await this.audit(
      actor,
      'key_result.update',
      'objective_key_result',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  // --- Goals ---

  async listGoals(userId: string, workerId?: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);
    const targetWorkerId = workerId ?? actingWorkerId;
    if (!targetWorkerId) {
      return [];
    }

    const worker = await this.getWorkerOrFail(targetWorkerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    return this.goalRepository.find({
      where: { tenantId, workerId: targetWorkerId },
      order: { createdAt: 'DESC' },
      relations: ['keyResult'],
    });
  }

  async createGoal(dto: CreateGoalDto, actor: ActorContext) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const worker = await this.getWorkerOrFail(dto.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    const goal = await this.goalRepository.save(
      this.goalRepository.create({
        tenantId,
        workerId: dto.workerId,
        keyResultId: dto.keyResultId ?? null,
        goalType: dto.goalType ?? undefined,
        title: dto.title,
        description: dto.description ?? null,
        weightPercent: dto.weightPercent ?? 0,
        dueDate: dto.dueDate ?? null,
        status: GoalStatus.ACTIVE,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(actor, 'goal.create', 'performance_goal', goal.id, {
      workerId: dto.workerId,
      title: goal.title,
    });

    return goal;
  }

  async updateGoal(id: string, dto: UpdateGoalDto, actor: ActorContext) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const goal = await this.goalRepository.findOne({ where: { id, tenantId } });
    if (!goal) {
      throw new NotFoundException({
        code: 'GOAL_NOT_FOUND',
        message: 'Goal not found',
      });
    }

    const worker = await this.getWorkerOrFail(goal.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    Object.assign(goal, dto);
    const saved = await this.goalRepository.save(goal);
    await this.audit(
      actor,
      'goal.update',
      'performance_goal',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  async addGoalCheckIn(
    goalId: string,
    dto: CreateGoalCheckInDto,
    actor: ActorContext,
  ) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const goal = await this.goalRepository.findOne({
      where: { id: goalId, tenantId },
    });
    if (!goal) {
      throw new NotFoundException({
        code: 'GOAL_NOT_FOUND',
        message: 'Goal not found',
      });
    }

    const worker = await this.getWorkerOrFail(goal.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    const checkIn = await this.checkInRepository.save(
      this.checkInRepository.create({
        tenantId,
        goalId,
        progressPercent: dto.progressPercent,
        progressStatus: dto.progressStatus,
        notes: dto.notes ?? null,
        authorUserId: actor.userId,
      }),
    );

    goal.progressPercent = dto.progressPercent;
    goal.progressStatus = dto.progressStatus;
    await this.goalRepository.save(goal);

    await this.audit(actor, 'goal.check_in', 'goal_check_in', checkIn.id, {
      goalId,
      progressPercent: dto.progressPercent,
    });

    return checkIn;
  }

  async listGoalCheckIns(goalId: string, userId: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);
    const goal = await this.goalRepository.findOne({
      where: { id: goalId, tenantId },
    });
    if (!goal) {
      throw new NotFoundException({
        code: 'GOAL_NOT_FOUND',
        message: 'Goal not found',
      });
    }

    const worker = await this.getWorkerOrFail(goal.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    return this.checkInRepository.find({
      where: { tenantId, goalId },
      order: { createdAt: 'DESC' },
    });
  }

  // --- Continuous feedback ---

  async createFeedback(dto: CreateFeedbackDto, actor: ActorContext) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'WORKER_PROFILE_REQUIRED',
        message: 'Worker profile required',
      });
    }

    await this.getWorkerOrFail(dto.recipientWorkerId, tenantId);

    const entry = await this.feedbackRepository.save(
      this.feedbackRepository.create({
        tenantId,
        authorWorkerId: actingWorkerId,
        recipientWorkerId: dto.recipientWorkerId,
        feedbackType: dto.feedbackType,
        message: dto.message,
        competencyTag: dto.competencyTag ?? null,
        isPrivate: dto.isPrivate ?? true,
        authorUserId: actor.userId,
      }),
    );

    await this.audit(actor, 'feedback.create', 'feedback_entry', entry.id, {
      recipientWorkerId: dto.recipientWorkerId,
      feedbackType: dto.feedbackType,
    });

    return entry;
  }

  async listFeedback(userId: string, workerId?: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);
    const targetWorkerId = workerId ?? actingWorkerId;
    if (!targetWorkerId) return [];

    const worker = await this.getWorkerOrFail(targetWorkerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    return this.feedbackRepository.find({
      where: [
        { tenantId, recipientWorkerId: targetWorkerId },
        { tenantId, authorWorkerId: targetWorkerId },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async createRecognition(dto: CreateRecognitionDto, actor: ActorContext) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'WORKER_PROFILE_REQUIRED',
        message: 'Worker profile required',
      });
    }

    await this.getWorkerOrFail(dto.recipientWorkerId, tenantId);

    const entry = await this.recognitionRepository.save(
      this.recognitionRepository.create({
        tenantId,
        authorWorkerId: actingWorkerId,
        recipientWorkerId: dto.recipientWorkerId,
        message: dto.message,
        valueTag: dto.valueTag ?? null,
        authorUserId: actor.userId,
      }),
    );

    await this.audit(
      actor,
      'recognition.create',
      'recognition_entry',
      entry.id,
      {
        recipientWorkerId: dto.recipientWorkerId,
      },
    );

    return entry;
  }

  async listRecognition(userId: string) {
    const { tenantId } = await this.getContext(userId);
    return this.recognitionRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // --- 1:1 meetings ---

  async createOneOnOne(dto: CreateOneOnOneDto, actor: ActorContext) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'WORKER_PROFILE_REQUIRED',
        message: 'Worker profile required',
      });
    }

    const employee = await this.getWorkerOrFail(dto.employeeWorkerId, tenantId);
    if (
      employee.managerId !== actingWorkerId &&
      !isPeopleOpsOrAdmin(
        await this.rbacService.getAuthContext(actor.userId, tenantId),
      )
    ) {
      throw new ForbiddenException({
        code: 'ONE_ON_ONE_CREATE_DENIED',
        message: 'Only the direct manager can schedule',
      });
    }

    const meeting = await this.oneOnOneRepository.save(
      this.oneOnOneRepository.create({
        tenantId,
        managerWorkerId: actingWorkerId,
        employeeWorkerId: dto.employeeWorkerId,
        scheduledAt: new Date(dto.scheduledAt),
        agenda: dto.agenda ?? null,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(
      actor,
      'one_on_one.create',
      'one_on_one_meeting',
      meeting.id,
      {
        employeeWorkerId: dto.employeeWorkerId,
      },
    );

    return meeting;
  }

  async listOneOnOnes(userId: string) {
    const { actingWorkerId, tenantId } = await this.getContext(userId);
    if (!actingWorkerId) return [];

    return this.oneOnOneRepository.find({
      where: [
        { tenantId, managerWorkerId: actingWorkerId },
        { tenantId, employeeWorkerId: actingWorkerId },
      ],
      order: { scheduledAt: 'DESC' },
    });
  }

  async updateOneOnOne(
    id: string,
    dto: UpdateOneOnOneDto,
    actor: ActorContext,
  ) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const meeting = await this.oneOnOneRepository.findOne({
      where: { id, tenantId },
    });
    if (!meeting) {
      throw new NotFoundException({
        code: 'ONE_ON_ONE_NOT_FOUND',
        message: 'Meeting not found',
      });
    }

    if (
      meeting.managerWorkerId !== actingWorkerId &&
      meeting.employeeWorkerId !== actingWorkerId
    ) {
      throw new ForbiddenException({
        code: 'ONE_ON_ONE_UPDATE_DENIED',
        message: 'Access denied',
      });
    }

    Object.assign(meeting, dto);
    const saved = await this.oneOnOneRepository.save(meeting);
    await this.audit(
      actor,
      'one_on_one.update',
      'one_on_one_meeting',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  async addOneOnOneNote(
    meetingId: string,
    dto: CreateOneOnOneNoteDto,
    actor: ActorContext,
  ) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const meeting = await this.oneOnOneRepository.findOne({
      where: { id: meetingId, tenantId },
    });
    if (!meeting) {
      throw new NotFoundException({
        code: 'ONE_ON_ONE_NOT_FOUND',
        message: 'Meeting not found',
      });
    }

    if (
      meeting.managerWorkerId !== actingWorkerId &&
      meeting.employeeWorkerId !== actingWorkerId
    ) {
      throw new ForbiddenException({
        code: 'ONE_ON_ONE_NOTE_DENIED',
        message: 'Access denied',
      });
    }

    const note = await this.oneOnOneNoteRepository.save(
      this.oneOnOneNoteRepository.create({
        tenantId,
        meetingId,
        content: dto.content,
        isShared: dto.isShared ?? false,
        authorUserId: actor.userId,
      }),
    );

    await this.audit(actor, 'one_on_one.note', 'one_on_one_note', note.id, {
      meetingId,
    });
    return note;
  }

  // --- Performance cycles & reviews ---

  async listCycles(userId: string) {
    const { tenantId } = await this.getContext(userId);
    return this.cycleRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async createCycle(dto: CreatePerformanceCycleDto, actor: ActorContext) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'CYCLE_CREATE_DENIED',
        message: 'Access denied',
      });
    }

    const cycle = await this.cycleRepository.save(
      this.cycleRepository.create({
        tenantId,
        name: dto.name,
        cycleType: dto.cycleType,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        populationFilter: dto.populationFilter ?? {},
        peerFeedbackEnabled: dto.peerFeedbackEnabled ?? false,
        calibrationEnabled: dto.calibrationEnabled ?? false,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(actor, 'cycle.create', 'performance_cycle', cycle.id, {
      name: cycle.name,
    });
    return cycle;
  }

  async updateCycle(
    id: string,
    dto: UpdatePerformanceCycleDto,
    actor: ActorContext,
  ) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'CYCLE_UPDATE_DENIED',
        message: 'Access denied',
      });
    }

    const cycle = await this.cycleRepository.findOne({
      where: { id, tenantId },
    });
    if (!cycle) {
      throw new NotFoundException({
        code: 'CYCLE_NOT_FOUND',
        message: 'Cycle not found',
      });
    }

    const activating =
      dto.status === PerformanceCycleStatus.ACTIVE &&
      cycle.status === PerformanceCycleStatus.DRAFT;

    Object.assign(cycle, dto);
    const saved = await this.cycleRepository.save(cycle);

    if (activating) {
      await this.spawnReviewsForCycle(saved, actor);
    }

    await this.audit(
      actor,
      'cycle.update',
      'performance_cycle',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  /**
   * FLW-TAL-004 / PRD §6.14.4 — probation cycles auto-trigger T-14 days
   * before `probationEndDate`. Runs daily from `TalentQueueModule`; one
   * dedicated single-worker cycle per probation window, idempotent via the
   * `populationFilter.workerId` lookup.
   */
  async runProbationAutoCycle(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{ evaluated: number; created: number }> {
    const dueWorkers = await this.workerRepository
      .createQueryBuilder('worker')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.status = :status', { status: WorkerStatus.ACTIVE })
      .andWhere('worker."probationEndDate" IS NOT NULL')
      .andWhere(
        `worker."probationEndDate" = (CURRENT_DATE + INTERVAL '14 days')::date`,
      )
      .getMany();

    let created = 0;
    for (const worker of dueWorkers) {
      const existing = await this.cycleRepository
        .createQueryBuilder('cycle')
        .where('cycle.tenantId = :tenantId', { tenantId })
        .andWhere('cycle.cycleType = :cycleType', {
          cycleType: PerformanceCycleType.PROBATION,
        })
        .andWhere(`cycle."populationFilter"->>'workerId' = :workerId`, {
          workerId: worker.id,
        })
        .getOne();
      if (existing) continue;

      const cycle = await this.cycleRepository.save(
        this.cycleRepository.create({
          tenantId,
          name: `Probation review – ${worker.firstName} ${worker.lastName}`,
          cycleType: PerformanceCycleType.PROBATION,
          status: PerformanceCycleStatus.ACTIVE,
          periodStart: worker.startDate,
          periodEnd: worker.probationEndDate as string,
          populationFilter: { workerId: worker.id },
          createdByUserId: SYSTEM_ACTOR_ID,
        }),
      );

      await this.reviewRepository.save(
        this.reviewRepository.create({
          tenantId,
          cycleId: cycle.id,
          workerId: worker.id,
          managerWorkerId: worker.managerId,
          snapshotGoalIds: [],
          status: ReviewStatus.PENDING_SELF,
        }),
      );

      await this.auditLogService.append({
        tenantId,
        actorId: SYSTEM_ACTOR_ID,
        action: 'cycle.probation_auto_create',
        entityType: 'performance_cycle',
        entityId: cycle.id,
        changes: {
          workerId: { old: null, new: worker.id },
          probationEndDate: { old: null, new: worker.probationEndDate },
        },
      });

      created += 1;
    }

    return { evaluated: dueWorkers.length, created };
  }

  private async spawnReviewsForCycle(
    cycle: PerformanceCycleEntity,
    actor: ActorContext,
  ) {
    const qb = this.workerRepository
      .createQueryBuilder('worker')
      .innerJoin('worker.employmentType', 'employmentType')
      .where('worker.tenantId = :tenantId', { tenantId: cycle.tenantId })
      .andWhere('worker.status = :status', { status: WorkerStatus.ACTIVE })
      .andWhere('employmentType.isFte = true');

    const filter = cycle.populationFilter ?? {};
    if (filter.divisionId) {
      qb.andWhere('worker.divisionId = :divisionId', {
        divisionId: filter.divisionId,
      });
    }
    if (filter.countryCode) {
      qb.andWhere('worker.countryCode = :countryCode', {
        countryCode: filter.countryCode,
      });
    }
    if (filter.departmentId) {
      qb.andWhere('worker.departmentId = :departmentId', {
        departmentId: filter.departmentId,
      });
    }

    const workers = await qb.getMany();

    for (const worker of workers) {
      const activeGoals = await this.goalRepository.find({
        where: {
          tenantId: cycle.tenantId,
          workerId: worker.id,
          status: GoalStatus.ACTIVE,
        },
      });

      const existing = await this.reviewRepository.findOne({
        where: {
          tenantId: cycle.tenantId,
          cycleId: cycle.id,
          workerId: worker.id,
        },
      });
      if (existing) continue;

      await this.reviewRepository.save(
        this.reviewRepository.create({
          tenantId: cycle.tenantId,
          cycleId: cycle.id,
          workerId: worker.id,
          managerWorkerId: worker.managerId,
          snapshotGoalIds: activeGoals.map((g) => g.id),
          status: ReviewStatus.PENDING_SELF,
        }),
      );
    }

    await this.audit(actor, 'cycle.activate', 'performance_cycle', cycle.id, {
      reviewCount: workers.length,
    });
  }

  async listReviews(userId: string, cycleId?: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);
    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .where('review.tenantId = :tenantId', { tenantId });

    if (cycleId) {
      qb.andWhere('review.cycleId = :cycleId', { cycleId });
    }

    if (!isPeopleOpsOrAdmin(auth)) {
      if (!actingWorkerId) {
        return [];
      }
      qb.andWhere(
        '(review.workerId = :actingWorkerId OR review.managerWorkerId = :actingWorkerId)',
        { actingWorkerId },
      );
    }

    return qb.orderBy('review.createdAt', 'DESC').getMany();
  }

  async getReview(id: string, userId: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);
    const review = await this.reviewRepository.findOne({
      where: { id, tenantId },
      relations: ['cycle'],
    });
    if (!review) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found',
      });
    }

    const worker = await this.getWorkerOrFail(review.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    return review;
  }

  async submitSelfAssessment(
    reviewId: string,
    dto: SubmitSelfAssessmentDto,
    actor: ActorContext,
  ) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, tenantId },
    });
    if (!review) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found',
      });
    }
    if (review.workerId !== actingWorkerId) {
      throw new ForbiddenException({
        code: 'SELF_ASSESSMENT_DENIED',
        message: 'Only the employee can submit self-assessment',
      });
    }

    review.selfAssessment = dto.selfAssessment;
    review.competencyRatings =
      dto.competencyRatings ?? review.competencyRatings;
    review.selfSubmittedAt = new Date();
    review.status = ReviewStatus.PENDING_MANAGER;

    const saved = await this.reviewRepository.save(review);
    await this.audit(
      actor,
      'review.self_submit',
      'performance_review',
      reviewId,
      {
        status: saved.status,
      },
    );
    return saved;
  }

  async submitManagerReview(
    reviewId: string,
    dto: SubmitManagerReviewDto,
    actor: ActorContext,
  ) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, tenantId },
      relations: ['cycle'],
    });
    if (!review) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found',
      });
    }
    if (review.managerWorkerId !== actingWorkerId) {
      throw new ForbiddenException({
        code: 'MANAGER_REVIEW_DENIED',
        message: 'Only the manager can submit manager review',
      });
    }

    review.managerAssessment = dto.managerAssessment;
    review.outcome = dto.outcome;
    review.probationOutcome = dto.probationOutcome ?? null;
    if (dto.competencyRatings) {
      review.competencyRatings = dto.competencyRatings;
    }
    review.managerSubmittedAt = new Date();
    review.status = review.cycle?.peerFeedbackEnabled
      ? ReviewStatus.PENDING_PEER
      : review.cycle?.calibrationEnabled
        ? ReviewStatus.PENDING_CALIBRATION
        : ReviewStatus.PENDING_SIGN_OFF;

    const saved = await this.reviewRepository.save(review);
    await this.audit(
      actor,
      'review.manager_submit',
      'performance_review',
      reviewId,
      {
        outcome: dto.outcome,
      },
    );
    return saved;
  }

  /**
   * FLW-TAL-004 calibration board — People Ops/division heads review the
   * `pending_calibration` population for a cycle side-by-side and adjust
   * final ratings before sign-off, correcting for manager-to-manager bias.
   */
  async listCalibrationBoard(cycleId: string, userId: string) {
    const { auth, tenantId } = await this.getContext(userId);
    if (
      !isPeopleOpsOrAdmin(auth) &&
      !auth.roleCodes.includes(PolarisRoleCode.DIVISION_HEAD)
    ) {
      throw new ForbiddenException({
        code: 'CALIBRATION_BOARD_DENIED',
        message:
          'Only People Ops or division heads can view the calibration board',
      });
    }

    const cycle = await this.cycleRepository.findOne({
      where: { id: cycleId, tenantId },
    });
    if (!cycle) {
      throw new NotFoundException({
        code: 'CYCLE_NOT_FOUND',
        message: 'Cycle not found',
      });
    }

    const reviews = await this.reviewRepository.find({
      where: { tenantId, cycleId },
      relations: ['worker'],
      order: { outcome: 'ASC', createdAt: 'ASC' },
    });

    return { cycle, reviews };
  }

  async finalizeCalibration(
    reviewId: string,
    dto: FinalizeCalibrationDto,
    actor: ActorContext,
  ) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (
      !isPeopleOpsOrAdmin(auth) &&
      !auth.roleCodes.includes(PolarisRoleCode.DIVISION_HEAD)
    ) {
      throw new ForbiddenException({
        code: 'CALIBRATION_BOARD_DENIED',
        message: 'Only People Ops or division heads can finalize calibration',
      });
    }

    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, tenantId },
    });
    if (!review) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found',
      });
    }
    if (review.status !== ReviewStatus.PENDING_CALIBRATION) {
      throw new BadRequestException({
        code: 'CALIBRATION_NOT_PENDING',
        message: 'Review is not pending calibration',
      });
    }

    const previousOutcome = review.outcome;
    if (dto.calibratedOutcome != null) review.outcome = dto.calibratedOutcome;
    if (dto.calibrationNotes != null) {
      review.managerAssessment =
        `${review.managerAssessment ?? ''}\n\n[Calibration] ${dto.calibrationNotes}`.trim();
    }
    review.status = ReviewStatus.PENDING_SIGN_OFF;

    const saved = await this.reviewRepository.save(review);
    await this.audit(
      actor,
      'review.calibration_finalize',
      'performance_review',
      reviewId,
      {
        outcome: { old: previousOutcome, new: saved.outcome },
      },
    );
    return saved;
  }

  async submitPeerFeedback(
    reviewId: string,
    dto: SubmitPeerFeedbackDto,
    actor: ActorContext,
  ) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'WORKER_PROFILE_REQUIRED',
        message: 'Worker profile required',
      });
    }

    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, tenantId },
      relations: ['cycle'],
    });
    if (!review?.cycle?.peerFeedbackEnabled) {
      throw new BadRequestException({
        code: 'PEER_FEEDBACK_DISABLED',
        message: 'Peer feedback not enabled for this cycle',
      });
    }

    const entry = await this.peerFeedbackRepository.save(
      this.peerFeedbackRepository.create({
        tenantId,
        reviewId,
        reviewerWorkerId: actingWorkerId,
        reviewerRole: dto.reviewerRole ?? undefined,
        feedback: dto.feedback,
        competencyRatings: dto.competencyRatings ?? {},
        submittedAt: new Date(),
      }),
    );

    await this.audit(
      actor,
      'review.peer_submit',
      'performance_review_peer_feedback',
      entry.id,
      {
        reviewId,
      },
    );
    return entry;
  }

  async signOffReview(
    reviewId: string,
    actor: ActorContext,
    asManager: boolean,
  ) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, tenantId },
    });
    if (!review) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found',
      });
    }

    if (asManager) {
      if (review.managerWorkerId !== actingWorkerId) {
        throw new ForbiddenException({
          code: 'SIGN_OFF_DENIED',
          message: 'Access denied',
        });
      }
      review.managerSignedOff = true;
    } else {
      if (review.workerId !== actingWorkerId) {
        throw new ForbiddenException({
          code: 'SIGN_OFF_DENIED',
          message: 'Access denied',
        });
      }
      review.employeeSignedOff = true;
    }

    if (review.managerSignedOff && review.employeeSignedOff) {
      review.status = ReviewStatus.COMPLETED;
      review.completedAt = new Date();
    }

    const saved = await this.reviewRepository.save(review);
    await this.audit(actor, 'review.sign_off', 'performance_review', reviewId, {
      asManager,
      status: saved.status,
    });
    return saved;
  }

  // --- Development plans ---

  async listDevelopmentPlans(userId: string, workerId?: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);
    const targetWorkerId = workerId ?? actingWorkerId;
    if (!targetWorkerId) return [];

    const worker = await this.getWorkerOrFail(targetWorkerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    return this.developmentPlanRepository.find({
      where: { tenantId, workerId: targetWorkerId },
      order: { createdAt: 'DESC' },
      relations: ['review'],
    });
  }

  async createDevelopmentPlan(
    dto: CreateDevelopmentPlanDto,
    actor: ActorContext,
  ) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const worker = await this.getWorkerOrFail(dto.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    const plan = await this.developmentPlanRepository.save(
      this.developmentPlanRepository.create({
        tenantId,
        workerId: dto.workerId,
        reviewId: dto.reviewId ?? null,
        title: dto.title,
        summary: dto.summary ?? null,
        status: DevelopmentPlanStatus.ACTIVE,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(
      actor,
      'development_plan.create',
      'development_plan',
      plan.id,
      {
        workerId: dto.workerId,
      },
    );
    return plan;
  }

  async updateDevelopmentPlan(
    id: string,
    dto: UpdateDevelopmentPlanDto,
    actor: ActorContext,
  ) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const plan = await this.developmentPlanRepository.findOne({
      where: { id, tenantId },
    });
    if (!plan) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Development plan not found',
      });
    }

    const worker = await this.getWorkerOrFail(plan.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    Object.assign(plan, dto);
    const saved = await this.developmentPlanRepository.save(plan);
    await this.audit(
      actor,
      'development_plan.update',
      'development_plan',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  async addDevelopmentAction(
    planId: string,
    dto: CreateDevelopmentActionDto,
    actor: ActorContext,
  ) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const plan = await this.developmentPlanRepository.findOne({
      where: { id: planId, tenantId },
    });
    if (!plan) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Development plan not found',
      });
    }

    const worker = await this.getWorkerOrFail(plan.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    const action = await this.developmentActionRepository.save(
      this.developmentActionRepository.create({
        tenantId,
        planId,
        actionType: dto.actionType,
        title: dto.title,
        description: dto.description ?? null,
        dueDate: dto.dueDate ?? null,
      }),
    );

    await this.audit(
      actor,
      'development_action.create',
      'development_plan_action',
      action.id,
      {
        planId,
        title: action.title,
      },
    );
    return action;
  }

  async updateDevelopmentAction(
    id: string,
    dto: UpdateDevelopmentActionDto,
    actor: ActorContext,
  ) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    const action = await this.developmentActionRepository.findOne({
      where: { id, tenantId },
      relations: ['plan'],
    });
    if (!action?.plan) {
      throw new NotFoundException({
        code: 'ACTION_NOT_FOUND',
        message: 'Action not found',
      });
    }

    const worker = await this.getWorkerOrFail(action.plan.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    Object.assign(action, dto);
    const saved = await this.developmentActionRepository.save(action);
    await this.audit(
      actor,
      'development_action.update',
      'development_plan_action',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  async listDevelopmentActions(planId: string, userId: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);
    const plan = await this.developmentPlanRepository.findOne({
      where: { id: planId, tenantId },
    });
    if (!plan) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Development plan not found',
      });
    }

    const worker = await this.getWorkerOrFail(plan.workerId, tenantId);
    assertWorkerPerformanceAccess(auth, actingWorkerId, worker);

    return this.developmentActionRepository.find({
      where: { tenantId, planId },
      order: { createdAt: 'ASC' },
    });
  }

  // --- Pulse surveys ---

  async listPulseSurveys(userId: string) {
    const { tenantId } = await this.getContext(userId);
    return this.pulseSurveyRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async createPulseSurvey(dto: CreatePulseSurveyDto, actor: ActorContext) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'PULSE_CREATE_DENIED',
        message: 'Access denied',
      });
    }

    const survey = await this.pulseSurveyRepository.save(
      this.pulseSurveyRepository.create({
        tenantId,
        title: dto.title,
        description: dto.description ?? null,
        questions: dto.questions,
        populationFilter: dto.populationFilter ?? {},
        closesAt: dto.closesAt ?? null,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(actor, 'pulse.create', 'pulse_survey', survey.id, {
      title: survey.title,
    });
    return survey;
  }

  async updatePulseSurvey(
    id: string,
    dto: UpdatePulseSurveyDto,
    actor: ActorContext,
  ) {
    const { auth, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'PULSE_UPDATE_DENIED',
        message: 'Access denied',
      });
    }

    const survey = await this.pulseSurveyRepository.findOne({
      where: { id, tenantId },
    });
    if (!survey) {
      throw new NotFoundException({
        code: 'PULSE_NOT_FOUND',
        message: 'Survey not found',
      });
    }

    Object.assign(survey, dto);
    const saved = await this.pulseSurveyRepository.save(survey);
    await this.audit(
      actor,
      'pulse.update',
      'pulse_survey',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  async submitPulseResponse(
    surveyId: string,
    dto: SubmitPulseResponseDto,
    actor: ActorContext,
  ) {
    const { actingWorkerId, tenantId } = await this.getContext(
      actor.userId,
      actor.tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'WORKER_PROFILE_REQUIRED',
        message: 'Worker profile required',
      });
    }

    const survey = await this.pulseSurveyRepository.findOne({
      where: { id: surveyId, tenantId },
    });
    if (!survey || survey.status !== PulseSurveyStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'PULSE_NOT_ACTIVE',
        message: 'Survey is not active',
      });
    }

    const existing = await this.pulseResponseRepository.findOne({
      where: { tenantId, surveyId, respondentWorkerId: actingWorkerId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'PULSE_ALREADY_RESPONDED',
        message: 'You have already responded to this survey',
      });
    }

    const response = await this.pulseResponseRepository.save(
      this.pulseResponseRepository.create({
        tenantId,
        surveyId,
        respondentWorkerId: actingWorkerId,
        answers: dto.answers,
      }),
    );

    await this.audit(
      actor,
      'pulse.respond',
      'pulse_survey_response',
      response.id,
      {
        surveyId,
      },
    );
    return { submitted: true };
  }

  async getPulseResults(surveyId: string, userId: string) {
    const { auth, tenantId } = await this.getContext(userId);
    if (!isPeopleOpsOrAdmin(auth)) {
      throw new ForbiddenException({
        code: 'PULSE_RESULTS_DENIED',
        message: 'Access denied',
      });
    }

    const survey = await this.pulseSurveyRepository.findOne({
      where: { id: surveyId, tenantId },
    });
    if (!survey) {
      throw new NotFoundException({
        code: 'PULSE_NOT_FOUND',
        message: 'Survey not found',
      });
    }

    const responses = await this.pulseResponseRepository.find({
      where: { tenantId, surveyId },
    });

    if (responses.length < survey.anonymityThreshold) {
      return {
        surveyId,
        responseCount: responses.length,
        aggregates: null,
        message: 'Below anonymity threshold',
      };
    }

    const aggregates: Record<string, { average: number; count: number }> = {};
    for (const question of survey.questions) {
      const values = responses
        .map((r) => r.answers[question.id])
        .filter((v): v is number => typeof v === 'number');
      aggregates[question.id] = {
        count: values.length,
        average: values.length
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0,
      };
    }

    return { surveyId, responseCount: responses.length, aggregates };
  }

  async getPerformanceDashboard(userId: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);

    const [goals, feedback, oneOnOnes, reviews, plans, recognition] =
      await Promise.all([
        actingWorkerId
          ? this.goalRepository.find({
              where: {
                tenantId,
                workerId: actingWorkerId,
                status: GoalStatus.ACTIVE,
              },
            })
          : [],
        actingWorkerId
          ? this.feedbackRepository.find({
              where: { tenantId, recipientWorkerId: actingWorkerId },
              order: { createdAt: 'DESC' },
              take: 5,
            })
          : [],
        actingWorkerId
          ? this.oneOnOneRepository.find({
              where: {
                tenantId,
                employeeWorkerId: actingWorkerId,
                status: OneOnOneStatus.SCHEDULED,
              },
              take: 5,
            })
          : [],
        this.listReviews(userId),
        actingWorkerId
          ? this.developmentPlanRepository.find({
              where: {
                tenantId,
                workerId: actingWorkerId,
                status: DevelopmentPlanStatus.ACTIVE,
              },
            })
          : [],
        this.recognitionRepository.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 10,
        }),
      ]);

    const objectives = isPeopleOpsOrAdmin(auth)
      ? await this.objectiveRepository.find({
          where: { tenantId, status: ObjectiveStatus.ACTIVE },
        })
      : await this.objectiveRepository.find({
          where: { tenantId, status: ObjectiveStatus.ACTIVE },
          take: 10,
        });

    const nameIds = new Set<string>();
    for (const entry of feedback) {
      nameIds.add(entry.authorWorkerId);
      nameIds.add(entry.recipientWorkerId);
    }
    for (const entry of recognition) {
      nameIds.add(entry.authorWorkerId);
      nameIds.add(entry.recipientWorkerId);
    }

    const nameByWorkerId = new Map<string, string>();
    if (nameIds.size > 0) {
      const workers = await this.workerRepository.find({
        where: { id: In([...nameIds]), tenantId },
      });
      for (const worker of workers) {
        nameByWorkerId.set(worker.id, workerDisplayName(worker));
      }
    }

    const enrichedFeedback = feedback.map((entry) => ({
      ...entry,
      authorName: nameByWorkerId.get(entry.authorWorkerId) ?? null,
      recipientName: nameByWorkerId.get(entry.recipientWorkerId) ?? null,
    }));

    const enrichedRecognition = recognition.map((entry) => ({
      ...entry,
      authorName: nameByWorkerId.get(entry.authorWorkerId) ?? null,
      recipientName: nameByWorkerId.get(entry.recipientWorkerId) ?? null,
    }));

    const reviewsSlice = reviews.slice(0, 10);

    return {
      actingWorkerId,
      goals,
      feedback: enrichedFeedback,
      oneOnOnes,
      reviews: reviewsSlice,
      developmentPlans: plans,
      recognition: enrichedRecognition,
      objectives,
      roleCodes: auth.roleCodes,
      reviewsAwaitingMe: countReviewsAwaitingMe(reviews, actingWorkerId),
    };
  }

  async getTeamPerformanceDashboard(userId: string) {
    const { auth, actingWorkerId, tenantId } = await this.getContext(userId);

    const allowedRoles = new Set<string>([
      PolarisRoleCode.MANAGER,
      PolarisRoleCode.DIVISION_HEAD,
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.SUPER_ADMIN,
      PolarisRoleCode.HRBP,
    ]);
    const allowed = auth.roleCodes.some((code) => allowedRoles.has(code));
    if (!allowed) {
      throw new ForbiddenException({
        code: 'TEAM_DASHBOARD_DENIED',
        message: 'You do not have access to the team performance dashboard',
      });
    }

    let reports: WorkerEntity[] = [];

    if (auth.broadestScope === ScopeType.ALL || isPeopleOpsOrAdmin(auth)) {
      reports = await this.workerRepository.find({
        where: {
          tenantId,
          status: WorkerStatus.ACTIVE,
        },
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
      reports = reports.filter((w) => w.managerId != null);
    } else if (
      auth.broadestScope === ScopeType.DIVISION ||
      auth.roleCodes.includes(PolarisRoleCode.DIVISION_HEAD)
    ) {
      const divisionIds = auth.assignments
        .filter((a) => a.scopeType === ScopeType.DIVISION && a.scopeId)
        .map((a) => a.scopeId as string);
      if (divisionIds.length === 0) {
        reports = [];
      } else {
        reports = await this.workerRepository.find({
          where: {
            tenantId,
            status: WorkerStatus.ACTIVE,
            divisionId: In(divisionIds),
          },
          order: { lastName: 'ASC', firstName: 'ASC' },
        });
      }
    } else {
      if (!actingWorkerId) {
        return {
          actingWorkerId: null,
          reports: [],
          oneOnOnes: [],
          reviewsAwaitingMe: 0,
        };
      }
      reports = await this.workerRepository.find({
        where: {
          tenantId,
          managerId: actingWorkerId,
          status: WorkerStatus.ACTIVE,
        },
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
    }

    const reportIds = reports.map((w) => w.id);
    const [goals, reviews, oneOnOnes] = await Promise.all([
      reportIds.length
        ? this.goalRepository.find({
            where: {
              tenantId,
              workerId: In(reportIds),
              status: GoalStatus.ACTIVE,
            },
          })
        : [],
      reportIds.length
        ? this.reviewRepository.find({
            where: { tenantId, workerId: In(reportIds) },
            order: { createdAt: 'DESC' },
          })
        : [],
      actingWorkerId
        ? this.oneOnOneRepository.find({
            where: {
              tenantId,
              managerWorkerId: actingWorkerId,
              status: OneOnOneStatus.SCHEDULED,
            },
            take: 20,
            order: { scheduledAt: 'ASC' },
          })
        : [],
    ]);

    const goalsByWorker = new Map<string, typeof goals>();
    for (const goal of goals) {
      const list = goalsByWorker.get(goal.workerId) ?? [];
      list.push(goal);
      goalsByWorker.set(goal.workerId, list);
    }

    const reviewsByWorker = new Map<string, typeof reviews>();
    for (const review of reviews) {
      const list = reviewsByWorker.get(review.workerId) ?? [];
      list.push(review);
      reviewsByWorker.set(review.workerId, list);
    }

    return {
      actingWorkerId,
      reports: reports.map((worker) => ({
        workerId: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        goals: goalsByWorker.get(worker.id) ?? [],
        reviews: reviewsByWorker.get(worker.id) ?? [],
      })),
      oneOnOnes,
      reviewsAwaitingMe: countReviewsAwaitingMe(reviews, actingWorkerId),
    };
  }
}
