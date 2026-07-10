import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
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
import { ContractorInvoiceStatus } from '../enums/contractor-invoice.enum';
import { ContractorInvoiceLineItemEntity } from './contractor-invoice-line-item.entity';

@Entity('contractor_invoices')
@Index(
  'IDX_contractor_invoices_tenant_invoice_number',
  ['tenantId', 'invoiceNumber'],
  { unique: true },
)
@Index('IDX_contractor_invoices_tenant_worker_status', [
  'tenantId',
  'workerId',
  'status',
])
export class ContractorInvoiceEntity {
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
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'varchar', length: 50 })
  invoiceNumber: string;

  @Column({ type: 'date' })
  invoiceDate: string;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'date', nullable: true })
  servicePeriodFrom: string | null;

  @Column({ type: 'date', nullable: true })
  servicePeriodTo: string | null;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  grossAmount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  taxAmount: string | null;

  @Column({
    type: 'enum',
    enum: ContractorInvoiceStatus,
    enumName: 'contractor_invoice_status_enum',
    default: ContractorInvoiceStatus.DRAFT,
  })
  status: ContractorInvoiceStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfBlobUrl: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  managerApprovedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  managerApprovedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  financeApprovedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  financeApprovedAt: Date | null;

  @OneToMany(() => ContractorInvoiceLineItemEntity, (line) => line.invoice)
  lineItems?: ContractorInvoiceLineItemEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
