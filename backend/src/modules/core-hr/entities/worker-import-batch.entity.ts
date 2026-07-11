import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  WorkerImportBatchStatus,
  WorkerImportRowOutcome,
} from '../enums/worker-import.enum';

export interface WorkerImportRowResult {
  rowNumber: number;
  email: string | null;
  outcome: WorkerImportRowOutcome;
  workerId?: string;
  error?: string;
}

/**
 * Bulk worker CSV import (enterprise-readiness.md T2) — validation preview
 * happens synchronously against `rows`; the actual create/update pass runs
 * in a BullMQ job so large files don't block the API request. Each row's
 * outcome is written to `audit_log` as it's processed and mirrored here in
 * `rowResults` for the People Ops UI.
 */
@Entity('worker_import_batches')
@Index('IDX_worker_import_batches_tenant_status', ['tenantId', 'status'])
export class WorkerImportBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({
    type: 'enum',
    enum: WorkerImportBatchStatus,
    enumName: 'worker_import_batch_status_enum',
    default: WorkerImportBatchStatus.PENDING,
  })
  status: WorkerImportBatchStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'jsonb' })
  rows: Record<string, string>[];

  @Column({ type: 'int', default: 0 })
  totalRows: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'jsonb', nullable: true })
  rowResults: WorkerImportRowResult[] | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
