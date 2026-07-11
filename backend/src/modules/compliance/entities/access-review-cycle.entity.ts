import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccessReviewCycleStatus } from '../enums/access-review.enum';
import { TenantEntity } from './tenant.entity';

/**
 * Quarterly access review runbook (FLW-SEC-005, deferred-compliance-work.md
 * §3) — opening a cycle snapshots the current `user_role_assignments` into
 * `access_review_items` so certification decisions are evidenced against a
 * point-in-time pack, not a moving target.
 */
@Entity('access_review_cycles')
export class AccessReviewCycleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 20 })
  periodLabel: string;

  @Column({
    type: 'enum',
    enum: AccessReviewCycleStatus,
    enumName: 'access_review_cycle_status_enum',
    default: AccessReviewCycleStatus.OPEN,
  })
  status: AccessReviewCycleStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  openedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
