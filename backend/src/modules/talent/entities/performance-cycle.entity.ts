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
import type { AssessmentQuestion } from '../assessment-questionnaire.util';
import {
  PerformanceCycleStatus,
  PerformanceCycleType,
} from '../enums/performance.enum';

@Entity('performance_cycles')
@Index('IDX_performance_cycles_tenant_status', ['tenantId', 'status'])
export class PerformanceCycleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: PerformanceCycleType })
  cycleType: PerformanceCycleType;

  @Column({
    type: 'enum',
    enum: PerformanceCycleStatus,
    default: PerformanceCycleStatus.DRAFT,
  })
  status: PerformanceCycleStatus;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'jsonb', default: {} })
  populationFilter: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  peerFeedbackEnabled: boolean;

  @Column({ type: 'varchar', length: 50, default: 'exceeds_meets_below' })
  ratingScale: string;

  @Column({ type: 'boolean', default: false })
  calibrationEnabled: boolean;

  @Column({ type: 'jsonb', default: [] })
  selfAssessmentTemplate: AssessmentQuestion[];

  @Column({ type: 'jsonb', default: [] })
  managerAssessmentTemplate: AssessmentQuestion[];

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
