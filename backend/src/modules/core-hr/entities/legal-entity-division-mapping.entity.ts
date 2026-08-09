import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { CurrencyCodeEntity } from '@/modules/country-config/entities/currency-code.entity';
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
import { DivisionEntity } from './division.entity';
import { LegalEntityEntity } from './legal-entity.entity';

@Entity('legal_entity_division_mappings')
@Index(
  'IDX_legal_entity_division_mappings_unique',
  ['tenantId', 'legalEntityId', 'divisionId', 'countryCode', 'effectiveFrom'],
  { unique: true },
)
@Index('IDX_legal_entity_division_mappings_lookup', [
  'tenantId',
  'countryCode',
  'divisionId',
])
export class LegalEntityDivisionMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  legalEntityId: string;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  @ManyToOne(() => DivisionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'divisionId' })
  division?: DivisionEntity | null;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('legal_entity_currencies')
@Index('IDX_legal_entity_currencies_unique', ['tenantId', 'legalEntityId', 'currencyCode'], {
  unique: true,
})
export class LegalEntityCurrencyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  legalEntityId: string;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @ManyToOne(() => CurrencyCodeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currencyCode', referencedColumnName: 'code' })
  currency?: CurrencyCodeEntity;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
