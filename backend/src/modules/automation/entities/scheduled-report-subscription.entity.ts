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
import { ReportCadence, ReportType } from '../enums/automation.enum';

@Entity('scheduled_report_subscriptions')
@Index('IDX_scheduled_reports_tenant_user', ['tenantId', 'userId'])
export class ScheduledReportSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ReportType,
    enumName: 'report_type_enum',
  })
  reportType: ReportType;

  @Column({
    type: 'enum',
    enum: ReportCadence,
    enumName: 'report_cadence_enum',
    default: ReportCadence.WEEKLY,
  })
  cadence: ReportCadence;

  @Column({ type: 'jsonb', default: {} })
  filters: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastDeliveredAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
