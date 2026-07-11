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

/**
 * Config table (never hard-coded) resolving the Finance/People Ops approval
 * chain for travel requests (PRD §6.17.2). One active rule per tenant for
 * Phase 2 Wave 3 — the most recently created row wins.
 */
@Entity('travel_approval_rules')
@Index('IDX_travel_approval_rules_tenant', ['tenantId'])
export class TravelApprovalRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountThreshold: string | null;

  @Column({ type: 'char', length: 3, nullable: true })
  currencyCode: string | null;

  @Column({ type: 'boolean', default: false })
  requireFinance: boolean;

  @Column({ type: 'boolean', default: false })
  requirePeopleOpsForInternational: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
