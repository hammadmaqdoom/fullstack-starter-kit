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
import {
  DevelopmentActionStatus,
  DevelopmentActionType,
  DevelopmentPlanStatus,
} from '../enums/performance.enum';
import { PerformanceReviewEntity } from './performance-review.entity';

@Entity('development_plans')
@Index('IDX_development_plans_worker', ['tenantId', 'workerId', 'status'])
export class DevelopmentPlanEntity {
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
  reviewId: string | null;

  @ManyToOne(() => PerformanceReviewEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'reviewId' })
  review?: PerformanceReviewEntity | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({
    type: 'enum',
    enum: DevelopmentPlanStatus,
    default: DevelopmentPlanStatus.DRAFT,
  })
  status: DevelopmentPlanStatus;

  @Column({ type: 'boolean', default: false })
  employeeSignedOff: boolean;

  @Column({ type: 'boolean', default: false })
  managerSignedOff: boolean;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('development_plan_actions')
@Index('IDX_development_actions_plan', ['tenantId', 'planId'])
export class DevelopmentPlanActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @ManyToOne(() => DevelopmentPlanEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan?: DevelopmentPlanEntity;

  @Column({ type: 'enum', enum: DevelopmentActionType })
  actionType: DevelopmentActionType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({
    type: 'enum',
    enum: DevelopmentActionStatus,
    default: DevelopmentActionStatus.PENDING,
  })
  status: DevelopmentActionStatus;

  @Column({ type: 'uuid', nullable: true })
  trainingCourseId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
