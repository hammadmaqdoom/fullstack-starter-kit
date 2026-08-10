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
import { BankFeedMatchStatus } from '../enums/payout.enum';
import { FundingAccountEntity } from './funding-account.entity';

@Entity('bank_feed_transactions')
@Index('IDX_bank_feed_transactions_funding', ['tenantId', 'fundingAccountId'])
@Index('IDX_bank_feed_transactions_match', ['tenantId', 'matchStatus'])
export class BankFeedTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  fundingAccountId: string;

  @ManyToOne(() => FundingAccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fundingAccountId' })
  fundingAccount?: FundingAccountEntity;

  @Column({ type: 'varchar', length: 128 })
  providerTxnId: string;

  /** Aspire credit/debit classification. */
  @Column({ type: 'varchar', length: 16 })
  txnType: string;

  /** Signed amount: credits positive, debits negative. */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  bookedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: BankFeedMatchStatus.UNMATCHED,
  })
  matchStatus: BankFeedMatchStatus;

  @Column({ type: 'uuid', nullable: true })
  matchedPayoutBatchLineId: string | null;

  @Column({ type: 'uuid', nullable: true })
  matchedCardTransactionId: string | null;

  @Column({ type: 'jsonb', default: {} })
  rawPayload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
