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
import { PayoutRail } from '../enums/payout.enum';

@Entity('payout_corridor_overrides')
@Index(
  'UQ_payout_corridor_overrides_route',
  ['tenantId', 'payerCountryCode', 'recipientBankCountryCode'],
  { unique: true },
)
export class PayoutCorridorOverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 2 })
  payerCountryCode: string;

  @Column({ type: 'char', length: 2 })
  recipientBankCountryCode: string;

  @Column({ type: 'varchar', length: 32 })
  primaryRail: PayoutRail;

  @Column({ type: 'varchar', length: 32, nullable: true })
  secondaryRail: PayoutRail | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: PayoutRail.MANUAL_BANK,
  })
  fallbackRail: PayoutRail;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
