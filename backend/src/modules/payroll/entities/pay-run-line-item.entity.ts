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
import { PayRunEntity } from './pay-run.entity';

@Entity('pay_run_line_items')
@Index('IDX_pay_run_line_items_pay_run', ['tenantId', 'payRunId'])
@Index('IDX_pay_run_line_items_worker', ['tenantId', 'workerId'])
export class PayRunLineItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  legalEntityId: string;

  @Column({ type: 'uuid' })
  payRunId: string;

  @ManyToOne(() => PayRunEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payRunId' })
  payRun?: PayRunEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  grossPay: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalDeductions: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netPay: string;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @Column({ type: 'jsonb', default: {} })
  calculationSnapshot: Record<string, unknown>;

  @Column({ type: 'jsonb', default: [] })
  anomalyFlags: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'date', nullable: true })
  paymentValueDate: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  swiftUetr: string | null;

  @Column({ type: 'uuid', nullable: true })
  remittancePackId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
