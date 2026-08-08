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
import {
  AlertRuleChannel,
  ComplianceAlertType,
} from '../enums/automation.enum';

/**
 * A rule's condition shape: which compliance metric to watch and the
 * threshold (in days) at which an alert should fire. Kept intentionally
 * small ("basic" custom rules per tasks.md §1.7) — richer boolean/AND-OR
 * conditions are a future enhancement.
 */
export interface AlertRuleCondition {
  metric: ComplianceAlertType;
  withinDays: number;
  severity?: 'info' | 'warning' | 'critical';
}

@Entity('alert_rules')
@Index('IDX_alert_rules_tenant_active', ['tenantId', 'isActive'])
export class AlertRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'jsonb', default: {} })
  conditionJson: AlertRuleCondition;

  @Column({
    type: 'enum',
    enum: AlertRuleChannel,
    enumName: 'alert_rule_channel_enum',
    default: AlertRuleChannel.IN_APP,
  })
  channel: AlertRuleChannel;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
