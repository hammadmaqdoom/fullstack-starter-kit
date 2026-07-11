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
import { ExpenseCategory } from '../enums/expense.enum';

/**
 * Country-scoped policy limits (PRD §6.9) — never hard-code caps in code;
 * resolved per `tenantId` + `countryCode` + `category` at submission time.
 */
@Entity('expense_policies')
@Index(
  'IDX_expense_policies_tenant_country_category',
  ['tenantId', 'countryCode', 'category'],
  { unique: true },
)
export class ExpensePolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    enumName: 'expense_category_enum',
  })
  category: ExpenseCategory;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  dailyCap: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  monthlyCap: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  receiptRequiredAbove: string | null;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
