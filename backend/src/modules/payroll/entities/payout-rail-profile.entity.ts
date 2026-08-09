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
import { PayoutRail } from '../enums/payout.enum';

@Entity('payout_rail_profiles')
@Index('UQ_payout_rail_profiles_tenant_entity', ['tenantId', 'legalEntityId'], {
  unique: true,
})
export class PayoutRailProfileEntity {
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
