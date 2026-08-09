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
import { ProviderCatalogKind } from '../enums/payout.enum';

export type ProviderCapabilityPayload = Record<string, unknown>;

@Entity('provider_capability_catalogs')
@Index('IDX_provider_capability_catalogs_kind', ['tenantId', 'kind'])
@Index('IDX_provider_capability_catalogs_country', [
  'tenantId',
  'kind',
  'countryCode',
])
export class ProviderCapabilityCatalogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 64 })
  kind: ProviderCatalogKind;

  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'char', length: 3, nullable: true })
  currencyCode: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload: ProviderCapabilityPayload;

  @Column({ type: 'boolean', default: true })
  isAllowed: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
