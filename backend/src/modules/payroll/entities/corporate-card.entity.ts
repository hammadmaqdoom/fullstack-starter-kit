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
  UpdateDateColumn,
} from 'typeorm';
import {
  CorporateCardProvider,
  CorporateCardStatus,
} from '../enums/payout.enum';
import { FundingAccountEntity } from './funding-account.entity';

@Entity('corporate_cards')
@Index('IDX_corporate_cards_entity', ['tenantId', 'legalEntityId'])
export class CorporateCardEntity {
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
  fundingAccountId: string | null;

  @ManyToOne(() => FundingAccountEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fundingAccountId' })
  fundingAccount?: FundingAccountEntity;

  @Column({ type: 'varchar', length: 32 })
  provider: CorporateCardProvider;

  @Column({ type: 'varchar', length: 128, nullable: true })
  externalCardId: string | null;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  spendLimit: string | null;

  @Column({ type: 'uuid', nullable: true })
  workerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  travelRequestId: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: CorporateCardStatus.ACTIVE,
  })
  status: CorporateCardStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
