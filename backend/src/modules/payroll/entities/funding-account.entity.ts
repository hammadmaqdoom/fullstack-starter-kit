import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FundingAccountProvider } from '../enums/payout.enum';

/** Manual bank fields for `manual_bank` funding accounts (Finance-redacted on read). */
export interface FundingAccountBankDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  iban?: string;
  swiftBic?: string;
  branchCode?: string;
  bankCountryCode?: string;
}

@Entity('funding_accounts')
@Index('IDX_funding_accounts_tenant_entity', ['tenantId', 'legalEntityId'])
@Index('IDX_funding_accounts_tenant_provider', ['tenantId', 'provider'])
export class FundingAccountEntity {
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

  @Column({ type: 'varchar', length: 32 })
  provider: FundingAccountProvider;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  externalAccountId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: FundingAccountBankDetails | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
