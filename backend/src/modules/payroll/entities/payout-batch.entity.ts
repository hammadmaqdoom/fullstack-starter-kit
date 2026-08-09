import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
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
import {
  PayoutBatchStatus,
  PayoutBatchType,
  PayoutRail,
} from '../enums/payout.enum';
import type { PayoutBatchLineEntity } from './payout-batch-line.entity';
import { FundingAccountEntity } from './funding-account.entity';

@Entity('payout_batches')
@Index('IDX_payout_batches_tenant_status', ['tenantId', 'status'])
@Index('IDX_payout_batches_tenant_entity', ['tenantId', 'legalEntityId'])
export class PayoutBatchEntity {
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

  @Column({ type: 'varchar', length: 40 })
  batchType: PayoutBatchType;

  @Column({ type: 'varchar', length: 32 })
  rail: PayoutRail;

  @Column({ type: 'uuid', nullable: true })
  fundingAccountId: string | null;

  @ManyToOne(() => FundingAccountEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'fundingAccountId' })
  fundingAccount?: FundingAccountEntity | null;

  @Column({ type: 'uuid', nullable: true })
  csvExportProfileId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ type: 'varchar', length: 32, default: PayoutBatchStatus.DRAFT })
  status: PayoutBatchStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerBatchId: string | null;

  @Column({ type: 'jsonb', default: [] })
  reasonCodes: string[];

  @OneToMany('PayoutBatchLineEntity', 'batch')
  lines?: PayoutBatchLineEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
