import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpenseClaimEntity } from './expense-claim.entity';

@Entity('expense_claim_lines')
@Index('IDX_expense_claim_lines_tenant_claim', ['tenantId', 'expenseClaimId'])
export class ExpenseClaimLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  expenseClaimId: string;

  @ManyToOne(() => ExpenseClaimEntity, (claim) => claim.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expenseClaimId' })
  claim?: ExpenseClaimEntity;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'date', nullable: true })
  expenseDate: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
