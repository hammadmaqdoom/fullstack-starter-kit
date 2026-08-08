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
import { GoalProgressStatus } from '../enums/performance.enum';
import { PerformanceGoalEntity } from './performance-goal.entity';

@Entity('goal_check_ins')
@Index('IDX_goal_check_ins_goal', ['tenantId', 'goalId'])
export class GoalCheckInEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  goalId: string;

  @ManyToOne(() => PerformanceGoalEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal?: PerformanceGoalEntity;

  @Column({ type: 'int' })
  progressPercent: number;

  @Column({ type: 'enum', enum: GoalProgressStatus })
  progressStatus: GoalProgressStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  authorUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
