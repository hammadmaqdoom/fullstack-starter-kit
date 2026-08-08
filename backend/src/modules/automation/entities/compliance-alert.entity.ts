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
  ComplianceAlertSeverity,
  ComplianceAlertStatus,
  ComplianceAlertType,
} from '../enums/automation.enum';
import { AlertRuleEntity } from './alert-rule.entity';

@Entity('compliance_alerts')
@Index('IDX_compliance_alerts_tenant_status', ['tenantId', 'status'])
@Index('IDX_compliance_alerts_dedupe', [
  'tenantId',
  'workerId',
  'alertType',
  'dueDate',
])
export class ComplianceAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid', nullable: true })
  workerId: string | null;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity | null;

  @Column({
    type: 'enum',
    enum: ComplianceAlertType,
    enumName: 'compliance_alert_type_enum',
  })
  alertType: ComplianceAlertType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({
    type: 'enum',
    enum: ComplianceAlertSeverity,
    enumName: 'compliance_alert_severity_enum',
    default: ComplianceAlertSeverity.INFO,
  })
  severity: ComplianceAlertSeverity;

  @Column({
    type: 'enum',
    enum: ComplianceAlertStatus,
    enumName: 'compliance_alert_status_enum',
    default: ComplianceAlertStatus.OPEN,
  })
  status: ComplianceAlertStatus;

  @Column({ type: 'uuid', nullable: true })
  sourceRuleId: string | null;

  @ManyToOne(() => AlertRuleEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sourceRuleId' })
  sourceRule?: AlertRuleEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
