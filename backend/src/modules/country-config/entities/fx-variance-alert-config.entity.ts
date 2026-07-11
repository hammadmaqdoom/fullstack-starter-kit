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
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';

@Entity('fx_variance_alert_configs')
@Index(
  'IDX_fx_variance_alert_configs_unique_pair',
  ['tenantId', 'fromCurrency', 'toCurrency'],
  { unique: true },
)
export class FxVarianceAlertConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 3 })
  fromCurrency: string;

  @Column({ type: 'char', length: 3 })
  toCurrency: string;

  /** Percentage move (day-over-day) that triggers a variance alert, e.g. 3.5 = 3.5%. */
  @Column({ type: 'decimal', precision: 6, scale: 2 })
  thresholdPercent: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
