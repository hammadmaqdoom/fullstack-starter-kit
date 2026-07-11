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
import { ApprovalMode, ApprovalWorkflowType } from '../enums/approval-routing.enum';

/**
 * Config-table routing rules for leave/expense/travel approvals
 * (enterprise-readiness.md T2 — thresholds, parallel vs serial, escalation
 * after N days). Country/legal-entity scoping is optional: a null value
 * means the tier applies tenant-wide unless a more specific row matches.
 * This is the routing *policy* — wiring it into the live approval engines
 * is a follow-up once workflow owners confirm rollout per workflow type.
 */
@Entity('approval_routing_configs')
@Index('IDX_approval_routing_configs_lookup', [
  'tenantId',
  'workflowType',
  'countryCode',
  'legalEntityId',
])
export class ApprovalRoutingConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({
    type: 'enum',
    enum: ApprovalWorkflowType,
    enumName: 'approval_workflow_type_enum',
  })
  workflowType: ApprovalWorkflowType;

  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId: string | null;

  /** Amount above which this tier applies (expense/travel); null for leave (day-count based tiers are a future enhancement). */
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  amountThreshold: string | null;

  @Column({
    type: 'enum',
    enum: ApprovalMode,
    enumName: 'approval_mode_enum',
    default: ApprovalMode.SERIAL,
  })
  approverMode: ApprovalMode;

  @Column({ type: 'int', nullable: true })
  escalationAfterDays: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
