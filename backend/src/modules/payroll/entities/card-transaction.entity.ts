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
import { CorporateCardEntity } from './corporate-card.entity';

@Entity('card_transactions')
@Index('IDX_card_transactions_card', ['tenantId', 'corporateCardId'])
export class CardTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  corporateCardId: string;

  @ManyToOne(() => CorporateCardEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'corporateCardId' })
  corporateCard?: CorporateCardEntity;

  @Column({ type: 'varchar', length: 128 })
  providerTxnId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  merchant: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  transactedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  expenseClaimId: string | null;

  @Column({ type: 'jsonb', default: {} })
  rawPayload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
