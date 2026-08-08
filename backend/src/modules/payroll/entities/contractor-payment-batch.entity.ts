import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContractorPaymentBatchStatus } from '../enums/payroll.enum';
import type { ContractorPaymentLineEntity } from './contractor-payment-line.entity';

/**
 * FLW-PAY-002 — one batch per aggregation run of Finance-approved contractor
 * invoices for a legal entity/period. `totalAmount` is the sum of line
 * `amount` at creation time (snapshot, not recalculated after lines change).
 */
@Entity('contractor_payment_batches')
@Index('IDX_contractor_payment_batches_tenant_entity_period', [
  'tenantId',
  'legalEntityId',
  'periodStart',
  'periodEnd',
])
export class ContractorPaymentBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  legalEntityId: string;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({
    type: 'enum',
    enum: ContractorPaymentBatchStatus,
    enumName: 'contractor_payment_batch_status_enum',
    default: ContractorPaymentBatchStatus.DRAFT,
  })
  status: ContractorPaymentBatchStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: string;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /** Inverse side — string relation name avoids circular import with payment-line entity. */
  @OneToMany('ContractorPaymentLineEntity', 'batch')
  lines?: ContractorPaymentLineEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
