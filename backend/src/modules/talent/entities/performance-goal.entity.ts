import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  GoalProgressStatus,
  GoalStatus,
  GoalType,
} from '../enums/performance.enum';
import { ObjectiveKeyResultEntity } from './objective-key-result.entity';
import { PerformanceCycleEntity } from './performance-cycle.entity';

@Entity('performance_goals')
@Index('IDX_performance_goals_worker', ['tenantId', 'workerId', 'status'])
export class PerformanceGoalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'uuid', nullable: true })
  keyResultId: string | null;

  @ManyToOne(() => ObjectiveKeyResultEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'keyResultId' })
  keyResult?: ObjectiveKeyResultEntity | null;

  @Column({ type: 'uuid', nullable: true })
  cycleId: string | null;

  @ManyToOne(() => PerformanceCycleEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'cycleId' })
  cycle?: PerformanceCycleEntity | null;

  @Column({ type: 'enum', enum: GoalType, default: GoalType.INDIVIDUAL })
  goalType: GoalType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  weightPercent: number;

  @Column({ type: 'int', default: 0 })
  progressPercent: number;

  @Column({
    type: 'enum',
    enum: GoalProgressStatus,
    default: GoalProgressStatus.ON_TRACK,
  })
  progressStatus: GoalProgressStatus;

  @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.DRAFT })
  status: GoalStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
