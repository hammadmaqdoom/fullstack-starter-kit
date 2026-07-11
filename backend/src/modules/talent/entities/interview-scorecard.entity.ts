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
import { ScorecardRecommendation } from '../enums/recruitment.enum';
import { CandidateEntity } from './candidate.entity';

export type ScorecardCriterion = {
  name: string;
  weight: number;
  score: number;
};

@Entity('interview_scorecards')
@Index('IDX_interview_scorecards_tenant_candidate', ['tenantId', 'candidateId'])
export class InterviewScorecardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  candidateId: string;

  @ManyToOne(() => CandidateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate?: CandidateEntity;

  @Column({ type: 'varchar', length: 50 })
  stage: string;

  @Column({ type: 'uuid' })
  interviewerWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'interviewerWorkerId' })
  interviewer?: WorkerEntity | null;

  @Column({ type: 'jsonb', default: [] })
  criteria: ScorecardCriterion[];

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallScore: string | null;

  @Column({
    type: 'enum',
    enum: ScorecardRecommendation,
    enumName: 'scorecard_recommendation_enum',
    nullable: true,
  })
  recommendation: ScorecardRecommendation | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  interviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
