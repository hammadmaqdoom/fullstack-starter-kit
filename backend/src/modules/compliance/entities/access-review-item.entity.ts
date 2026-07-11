import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccessReviewItemStatus } from '../enums/access-review.enum';
import { AccessReviewCycleEntity } from './access-review-cycle.entity';
import { TenantEntity } from './tenant.entity';

@Entity('access_review_items')
@Index('IDX_access_review_items_cycle', ['tenantId', 'cycleId'])
@Index('IDX_access_review_items_worker', ['tenantId', 'workerId'])
export class AccessReviewItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  cycleId: string;

  @ManyToOne(() => AccessReviewCycleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycleId' })
  cycle?: AccessReviewCycleEntity;

  /** Snapshot of the role assignment reviewed — kept even if the assignment is later revoked. */
  @Column({ type: 'uuid', nullable: true })
  assignmentId: string | null;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  userEmail: string;

  /** Resolved worker id (if any) — used to scope items to the assignee's manager for team-level certification. */
  @Column({ type: 'uuid', nullable: true })
  workerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  managerWorkerId: string | null;

  @Column({ type: 'varchar', length: 50 })
  roleCode: string;

  @Column({ type: 'varchar', length: 20 })
  scopeType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  scopeLabel: string | null;

  @Column({
    type: 'enum',
    enum: AccessReviewItemStatus,
    enumName: 'access_review_item_status_enum',
    default: AccessReviewItemStatus.PENDING,
  })
  status: AccessReviewItemStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
