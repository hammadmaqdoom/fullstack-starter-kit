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
import { PayoutLineStatus, PayoutSourceType } from '../enums/payout.enum';
import { PayoutBatchEntity } from './payout-batch.entity';

@Entity('payout_batch_lines')
@Index('IDX_payout_batch_lines_batch', ['tenantId', 'batchId'])
@Index('IDX_payout_batch_lines_source', ['tenantId', 'sourceType', 'sourceId'])
export class PayoutBatchLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  batchId: string;

  @ManyToOne(() => PayoutBatchEntity, (b) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch?: PayoutBatchEntity;

  @Column({ type: 'varchar', length: 40 })
  sourceType: PayoutSourceType;

  @Column({ type: 'uuid' })
  sourceId: string;

  @Column({ type: 'uuid' })
  workerId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 32, default: PayoutLineStatus.PENDING })
  status: PayoutLineStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerTransferId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'jsonb', default: [] })
  issues: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
