import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import { PulseSurveyStatus } from '../enums/performance.enum';

@Entity('pulse_surveys')
@Index('IDX_pulse_surveys_tenant_status', ['tenantId', 'status'])
export class PulseSurveyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: [] })
  questions: Array<{
    id: string;
    text: string;
    scaleMin: number;
    scaleMax: number;
  }>;

  @Column({ type: 'jsonb', default: {} })
  populationFilter: Record<string, unknown>;

  @Column({ type: 'int', default: 5 })
  anonymityThreshold: number;

  @Column({
    type: 'enum',
    enum: PulseSurveyStatus,
    default: PulseSurveyStatus.DRAFT,
  })
  status: PulseSurveyStatus;

  @Column({ type: 'date', nullable: true })
  closesAt: string | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('pulse_survey_responses')
@Index('IDX_pulse_responses_survey', ['tenantId', 'surveyId'])
export class PulseSurveyResponseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  surveyId: string;

  @ManyToOne(() => PulseSurveyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surveyId' })
  survey?: PulseSurveyEntity;

  @Column({ type: 'uuid' })
  respondentWorkerId: string;

  @Column({ type: 'jsonb' })
  answers: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;
}
