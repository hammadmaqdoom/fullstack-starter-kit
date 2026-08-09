import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AssessmentPayload } from '../assessment-questionnaire.util';
import {
  PeerFeedbackRole,
  ProbationOutcome,
  ReviewOutcome,
  ReviewStatus,
} from '../enums/performance.enum';
import { PerformanceCycleEntity } from './performance-cycle.entity';

@Entity('performance_reviews')
@Index(
  'IDX_performance_reviews_cycle_worker',
  ['tenantId', 'cycleId', 'workerId'],
  {
    unique: true,
  },
)
export class PerformanceReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  cycleId: string;

  @ManyToOne(() => PerformanceCycleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycleId' })
  cycle?: PerformanceCycleEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'uuid', nullable: true })
  managerWorkerId: string | null;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING_SELF,
  })
  status: ReviewStatus;

  @Column({ type: 'text', nullable: true })
  selfAssessment: string | null;

  @Column({ type: 'text', nullable: true })
  managerAssessment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  selfAssessmentPayload: AssessmentPayload | null;

  @Column({ type: 'jsonb', nullable: true })
  managerAssessmentPayload: AssessmentPayload | null;

  @Column({ type: 'enum', enum: ReviewOutcome, nullable: true })
  outcome: ReviewOutcome | null;

  @Column({ type: 'enum', enum: ProbationOutcome, nullable: true })
  probationOutcome: ProbationOutcome | null;

  @Column({ type: 'jsonb', default: {} })
  competencyRatings: Record<string, number>;

  @Column({ type: 'jsonb', default: [] })
  snapshotGoalIds: string[];

  @Column({ type: 'boolean', default: false })
  employeeSignedOff: boolean;

  @Column({ type: 'boolean', default: false })
  managerSignedOff: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  selfSubmittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  managerSubmittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('performance_review_peer_feedback')
@Index('IDX_peer_feedback_review', ['tenantId', 'reviewId'])
export class PerformanceReviewPeerFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  reviewId: string;

  @ManyToOne(() => PerformanceReviewEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review?: PerformanceReviewEntity;

  @Column({ type: 'uuid' })
  reviewerWorkerId: string;

  @Column({
    type: 'enum',
    enum: PeerFeedbackRole,
    default: PeerFeedbackRole.PEER,
  })
  reviewerRole: PeerFeedbackRole;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'jsonb', default: {} })
  competencyRatings: Record<string, number>;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
