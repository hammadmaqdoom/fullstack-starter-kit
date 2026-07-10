import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractorInvoiceEntity } from './contractor-invoice.entity';

@Entity('contractor_invoice_line_items')
@Index('IDX_contractor_invoice_line_items_invoice', ['tenantId', 'invoiceId'])
export class ContractorInvoiceLineItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => ContractorInvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: ContractorInvoiceEntity;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
