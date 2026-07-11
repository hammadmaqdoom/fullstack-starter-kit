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
import { ExpenseCategory, ExpenseClaimStatus } from '../enums/expense.enum';
import { ExpenseClaimLineEntity } from './expense-claim-line.entity';

/** Policy check result recorded for manager/finance visibility (FLW-OPS-001 step 1). */
export interface ExpensePolicyViolation {
  type: 'daily_cap' | 'monthly_cap';
  capAmount: string;
  actualAmount: string;
  currencyCode: string;
}

/** OCR-assist stub (PRD §6.9) — no real OCR provider wired up in Phase 2 Wave 3. */
export interface ExpenseOcrPrefill {
  merchant?: string;
  amount?: number;
  currencyCode?: string;
  date?: string;
  [key: string]: unknown;
}

@Entity('expense_claims')
@Index('IDX_expense_claims_tenant_worker_status', [
  'tenantId',
  'workerId',
  'status',
])
@Index('IDX_expense_claims_travel_request', ['tenantId', 'travelRequestId'])
export class ExpenseClaimEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId: string | null;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity | null;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  /** Set only when the claim is linked to an approved travel request (PRD §6.17.3). No FK — cross-migration ordering. */
  @Column({ type: 'uuid', nullable: true })
  travelRequestId: string | null;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    enumName: 'expense_category_enum',
  })
  category: ExpenseCategory;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @Column({ type: 'date' })
  expenseDate: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptBlobUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  ocrPrefill: ExpenseOcrPrefill | null;

  @Column({
    type: 'enum',
    enum: ExpenseClaimStatus,
    enumName: 'expense_claim_status_enum',
    default: ExpenseClaimStatus.DRAFT,
  })
  status: ExpenseClaimStatus;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  managerApprovedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  managerApprovedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  financeApprovedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  financeApprovedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  policyViolation: ExpensePolicyViolation | null;

  @OneToMany(() => ExpenseClaimLineEntity, (line) => line.claim)
  lines?: ExpenseClaimLineEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
