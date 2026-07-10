import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractorPaymentBatchEntity } from './contractor-payment-batch.entity';

/**
 * FLW-PAY-002 — one line per contractor invoice included in a payment
 * batch. `withholdingTax`/`paymentReference`/`paymentValueDate`/`swiftUetr`
 * are filled in by Finance during review/payment; `paidAt` is set by
 * `mark-paid` and mirrors the linked invoice moving to `paid`.
 */
@Entity('contractor_payment_lines')
@Index('IDX_contractor_payment_lines_tenant_batch', ['tenantId', 'batchId'])
@Index('IDX_contractor_payment_lines_tenant_invoice', ['tenantId', 'invoiceId'])
export class ContractorPaymentLineEntity {
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

  @Column({ type: 'uuid' })
  batchId: string;

  @ManyToOne(() => ContractorPaymentBatchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch?: ContractorPaymentBatchEntity;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => ContractorInvoiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: ContractorInvoiceEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  withholdingTax: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'date', nullable: true })
  paymentValueDate: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  swiftUetr: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
