import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
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
import { RemittanceCorridorConfigEntity } from './remittance-corridor-config.entity';
import { RemittancePackDocumentEntity } from './remittance-pack-document.entity';
import { PayRunEntity } from './pay-run.entity';
import {
  RemittancePackStatus,
  RemittancePaymentSourceType,
} from '../enums/remittance.enum';

/**
 * FLW-PAY-005 — one pack per cross-border payment line (`pay_run_line` or
 * `contractor_payment_line`). `(tenantId, paymentSourceType,
 * paymentSourceId)` is unique so `ensurePackForPayment` is idempotent.
 */
@Entity('remittance_packs')
@Index(
  'IDX_remittance_packs_source',
  ['tenantId', 'paymentSourceType', 'paymentSourceId'],
  { unique: true },
)
@Index('IDX_remittance_packs_worker', ['tenantId', 'workerId'])
export class RemittancePackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({
    type: 'enum',
    enum: RemittancePaymentSourceType,
    enumName: 'remittance_payment_source_type_enum',
  })
  paymentSourceType: RemittancePaymentSourceType;

  @Column({ type: 'uuid' })
  paymentSourceId: string;

  @Column({ type: 'uuid', nullable: true })
  invoiceId: string | null;

  @ManyToOne(() => ContractorInvoiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: ContractorInvoiceEntity;

  @Column({ type: 'uuid', nullable: true })
  payRunId: string | null;

  @ManyToOne(() => PayRunEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payRunId' })
  payRun?: PayRunEntity;

  @Column({ type: 'uuid' })
  corridorConfigId: string;

  @ManyToOne(() => RemittanceCorridorConfigEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'corridorConfigId' })
  corridorConfig?: RemittanceCorridorConfigEntity;

  @Column({
    type: 'enum',
    enum: RemittancePackStatus,
    enumName: 'remittance_pack_status_enum',
    default: RemittancePackStatus.ASSEMBLING,
  })
  status: RemittancePackStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => RemittancePackDocumentEntity, (document) => document.pack)
  documents?: RemittancePackDocumentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
