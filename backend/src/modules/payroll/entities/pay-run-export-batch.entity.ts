import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExportFileFormat } from '../enums/payroll.enum';
import { FinanceExportProfileEntity } from './finance-export-profile.entity';
import { PayRunEntity } from './pay-run.entity';

/**
 * One row per generated export pack (FLW-PAY-001 step 5 / FLW-PAY-002 step
 * 4). `payRunId` covers employee pay runs; `contractorPaymentBatchId`
 * (Phase 2 contractor portal, not yet scaffolded) is reserved for
 * contractor payment batch exports — exactly one of the two is expected to
 * be set. No Xero API — Finance enters totals manually.
 */
@Entity('pay_run_export_batches')
@Index('IDX_pay_run_export_batches_pay_run', ['tenantId', 'payRunId'])
@Index('IDX_pay_run_export_batches_contractor_batch', [
  'tenantId',
  'contractorPaymentBatchId',
])
export class PayRunExportBatchEntity {
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

  @Column({ type: 'uuid', nullable: true })
  payRunId: string | null;

  @ManyToOne(() => PayRunEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'payRunId' })
  payRun?: PayRunEntity | null;

  @Column({ type: 'uuid', nullable: true })
  contractorPaymentBatchId: string | null;

  @Column({ type: 'uuid' })
  exportProfileId: string;

  @ManyToOne(() => FinanceExportProfileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exportProfileId' })
  exportProfile?: FinanceExportProfileEntity;

  @Column({
    type: 'enum',
    enum: ExportFileFormat,
    enumName: 'export_file_format_enum',
  })
  fileFormat: ExportFileFormat;

  @Column({ type: 'varchar', length: 500 })
  blobUrl: string;

  @Column({ type: 'uuid' })
  exportedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  exportedAt: Date;
}
