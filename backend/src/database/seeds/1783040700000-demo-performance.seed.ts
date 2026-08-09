import { DEMO_PERSONAS } from '@/modules/compliance/constants/demo-persona.constants';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import {
  FeedbackEntryEntity,
  RecognitionEntryEntity,
} from '@/modules/talent/entities/feedback.entity';
import { ObjectiveKeyResultEntity } from '@/modules/talent/entities/objective-key-result.entity';
import { OneOnOneMeetingEntity } from '@/modules/talent/entities/one-on-one.entity';
import { OrganizationalObjectiveEntity } from '@/modules/talent/entities/organizational-objective.entity';
import { PerformanceCycleEntity } from '@/modules/talent/entities/performance-cycle.entity';
import { PerformanceGoalEntity } from '@/modules/talent/entities/performance-goal.entity';
import { PerformanceReviewEntity } from '@/modules/talent/entities/performance-review.entity';
import {
  FeedbackType,
  GoalProgressStatus,
  GoalStatus,
  GoalType,
  KeyResultStatus,
  ObjectiveLevel,
  ObjectiveStatus,
  OneOnOneStatus,
  PerformanceCycleStatus,
  PerformanceCycleType,
  ReviewStatus,
} from '@/modules/talent/enums/performance.enum';
import { DataSource, Repository } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

const IDS = {
  goalEmployeeOnTrack: 'a3100000-0000-4000-8000-000000000001',
  goalEmployeeAtRisk: 'a3100000-0000-4000-8000-000000000002',
  goalEmployee2: 'a3100000-0000-4000-8000-000000000003',
  feedback1: 'a3100000-0000-4000-8000-000000000010',
  recognition1: 'a3100000-0000-4000-8000-000000000020',
  oneOnOne1: 'a3100000-0000-4000-8000-000000000030',
  objective1: 'a3100000-0000-4000-8000-000000000040',
  keyResult1: 'a3100000-0000-4000-8000-000000000041',
  cycle1: 'a3100000-0000-4000-8000-000000000050',
  reviewEmployeePendingSelf: 'a3100000-0000-4000-8000-000000000051',
  reviewEmployee2PendingManager: 'a3100000-0000-4000-8000-000000000052',
} as const;

function persona(key: string) {
  const found = DEMO_PERSONAS.find((p) => p.key === key);
  if (!found) {
    throw new Error(`Missing demo persona ${key}`);
  }
  return found;
}

async function upsertById<T extends { id: string }>(
  repo: Repository<T>,
  id: string,
  data: Partial<T>,
): Promise<void> {
  const existing = await repo.findOne({ where: { id } as never });
  if (!existing) {
    await repo.save(repo.create({ id, ...data } as T));
    return;
  }
  Object.assign(existing, data);
  await repo.save(existing);
}

/** Demo IPMS fixtures for employee/manager/people-ops performance smoke. */
export class DemoPerformanceSeed1783040700000 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const employee = persona('employee');
    const employee2 = persona('employee2');
    const manager = persona('manager');
    const peopleops = persona('peopleops');
    const year = new Date().getFullYear();
    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;
    const dueDate = `${year}-12-15`;

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 7);
    scheduledAt.setHours(10, 0, 0, 0);

    const goalRepo = dataSource.getRepository(PerformanceGoalEntity);
    const feedbackRepo = dataSource.getRepository(FeedbackEntryEntity);
    const recognitionRepo = dataSource.getRepository(RecognitionEntryEntity);
    const oneOnOneRepo = dataSource.getRepository(OneOnOneMeetingEntity);
    const objectiveRepo = dataSource.getRepository(
      OrganizationalObjectiveEntity,
    );
    const keyResultRepo = dataSource.getRepository(ObjectiveKeyResultEntity);
    const cycleRepo = dataSource.getRepository(PerformanceCycleEntity);
    const reviewRepo = dataSource.getRepository(PerformanceReviewEntity);

    await upsertById(goalRepo, IDS.goalEmployeeOnTrack, {
      tenantId: DIGITARO_TENANT_ID,
      workerId: employee.workerId,
      keyResultId: null,
      cycleId: null,
      goalType: GoalType.INDIVIDUAL,
      title: 'Ship Q3 platform reliability improvements',
      description: 'Reduce P1 incidents and improve check-in latency.',
      weightPercent: 40,
      progressPercent: 60,
      progressStatus: GoalProgressStatus.ON_TRACK,
      status: GoalStatus.ACTIVE,
      dueDate,
      createdByUserId: employee.userId,
    });

    await upsertById(goalRepo, IDS.goalEmployeeAtRisk, {
      tenantId: DIGITARO_TENANT_ID,
      workerId: employee.workerId,
      keyResultId: null,
      cycleId: null,
      goalType: GoalType.INDIVIDUAL,
      title: 'Complete security awareness curriculum',
      description: 'Finish assigned modules before policy refresh.',
      weightPercent: 20,
      progressPercent: 35,
      progressStatus: GoalProgressStatus.AT_RISK,
      status: GoalStatus.ACTIVE,
      dueDate,
      createdByUserId: employee.userId,
    });

    await upsertById(goalRepo, IDS.goalEmployee2, {
      tenantId: DIGITARO_TENANT_ID,
      workerId: employee2.workerId,
      keyResultId: null,
      cycleId: null,
      goalType: GoalType.INDIVIDUAL,
      title: 'Improve team documentation coverage',
      description: 'Document critical runbooks for Labs services.',
      weightPercent: 30,
      progressPercent: 45,
      progressStatus: GoalProgressStatus.ON_TRACK,
      status: GoalStatus.ACTIVE,
      dueDate,
      createdByUserId: employee2.userId,
    });

    await upsertById(feedbackRepo, IDS.feedback1, {
      tenantId: DIGITARO_TENANT_ID,
      authorWorkerId: manager.workerId,
      recipientWorkerId: employee.workerId,
      feedbackType: FeedbackType.PRAISE,
      message:
        'Strong ownership on the check-in reliability work — clear updates and solid collaboration.',
      competencyTag: 'ownership',
      isPrivate: false,
      authorUserId: manager.userId,
    });

    await upsertById(recognitionRepo, IDS.recognition1, {
      tenantId: DIGITARO_TENANT_ID,
      authorWorkerId: manager.workerId,
      recipientWorkerId: employee.workerId,
      message: 'Thanks for unblocking the Hub inbox polish last week.',
      valueTag: 'collaboration',
      authorUserId: manager.userId,
    });

    await upsertById(oneOnOneRepo, IDS.oneOnOne1, {
      tenantId: DIGITARO_TENANT_ID,
      managerWorkerId: manager.workerId,
      employeeWorkerId: employee.workerId,
      scheduledAt,
      status: OneOnOneStatus.SCHEDULED,
      agenda: 'Goals progress, blockers, and career development',
      createdByUserId: manager.userId,
    });

    await upsertById(objectiveRepo, IDS.objective1, {
      tenantId: DIGITARO_TENANT_ID,
      level: ObjectiveLevel.COMPANY,
      divisionId: null,
      departmentId: null,
      title: 'Deliver a reliable Polaris HR platform',
      description: 'Company OKR for product stability and employee experience.',
      periodStart,
      periodEnd,
      status: ObjectiveStatus.ACTIVE,
      createdByUserId: peopleops.userId,
    });

    await upsertById(keyResultRepo, IDS.keyResult1, {
      tenantId: DIGITARO_TENANT_ID,
      objectiveId: IDS.objective1,
      title: 'Keep P1 incident count under 5 per quarter',
      description: null,
      targetValue: '5',
      currentValue: '2',
      unit: 'incidents',
      status: KeyResultStatus.IN_PROGRESS,
      weightPercent: 100,
    });

    await upsertById(cycleRepo, IDS.cycle1, {
      tenantId: DIGITARO_TENANT_ID,
      name: `${year} Annual Review (Demo)`,
      cycleType: PerformanceCycleType.ANNUAL,
      status: PerformanceCycleStatus.ACTIVE,
      periodStart,
      periodEnd,
      populationFilter: {},
      peerFeedbackEnabled: false,
      ratingScale: 'exceeds_meets_below',
      calibrationEnabled: true,
      createdByUserId: peopleops.userId,
    });

    await upsertById(reviewRepo, IDS.reviewEmployeePendingSelf, {
      tenantId: DIGITARO_TENANT_ID,
      cycleId: IDS.cycle1,
      workerId: employee.workerId,
      managerWorkerId: manager.workerId,
      status: ReviewStatus.PENDING_SELF,
      selfAssessment: null,
      managerAssessment: null,
      outcome: null,
      probationOutcome: null,
      competencyRatings: {},
      snapshotGoalIds: [IDS.goalEmployeeOnTrack, IDS.goalEmployeeAtRisk],
      employeeSignedOff: false,
      managerSignedOff: false,
      selfSubmittedAt: null,
      managerSubmittedAt: null,
      completedAt: null,
    });

    await upsertById(reviewRepo, IDS.reviewEmployee2PendingManager, {
      tenantId: DIGITARO_TENANT_ID,
      cycleId: IDS.cycle1,
      workerId: employee2.workerId,
      managerWorkerId: manager.workerId,
      status: ReviewStatus.PENDING_MANAGER,
      selfAssessment: 'I delivered documentation coverage for core Labs runbooks.',
      managerAssessment: null,
      outcome: null,
      probationOutcome: null,
      competencyRatings: {},
      snapshotGoalIds: [IDS.goalEmployee2],
      employeeSignedOff: false,
      managerSignedOff: false,
      selfSubmittedAt: new Date(),
      managerSubmittedAt: null,
      completedAt: null,
    });

    // eslint-disable-next-line no-console
    console.log(
      'Demo performance seed ready (goals, feedback, 1:1, OKRs, reviews).',
    );
  }
}
