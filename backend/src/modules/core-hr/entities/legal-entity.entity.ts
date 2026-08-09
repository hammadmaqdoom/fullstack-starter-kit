import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { CurrencyCodeEntity } from '@/modules/country-config/entities/currency-code.entity';
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
import { EntityStatus, LegalEntityRenderProfile } from '../enums/org.enum';
import type { LegalEntityStatutoryIdEntity } from './legal-entity-statutory-id.entity';

@Entity('legal_entities')
@Index('IDX_legal_entities_tenant_code', ['tenantId', 'code'], { unique: true })
@Index('IDX_legal_entities_scope', ['tenantId', 'countryCode', 'status'])
export class LegalEntityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  registeredName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tradingName: string | null;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'char', length: 3 })
  functionalCurrency: string;

  @ManyToOne(() => CurrencyCodeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'functionalCurrency' })
  functionalCurrencyRef?: CurrencyCodeEntity;

  @Column({
    type: 'enum',
    enum: EntityStatus,
    enumName: 'entity_status_enum',
    default: EntityStatus.ACTIVE,
  })
  status: EntityStatus;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  /** Manual-sign path shows stamp placement zone + checklist when true (PRD §6.8.1). Stamps are never auto-rendered. */
  @Column({ type: 'boolean', default: false })
  requiresWetStamp: boolean;

  @Column({ type: 'text', nullable: true })
  stampInstructions: string | null;

  @Column({
    type: 'enum',
    enum: LegalEntityRenderProfile,
    enumName: 'legal_entity_render_profile_enum',
    default: LegalEntityRenderProfile.FULL_DIGITAL,
  })
  defaultRenderProfile: LegalEntityRenderProfile;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stateProvince: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  footerText: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoBlobUrl: string | null;

  @Column({ type: 'boolean', default: true })
  pageNumberingEnabled: boolean;

  @Column({ type: 'uuid', nullable: true })
  payrollExportProfileId: string | null;

  @OneToMany('LegalEntityStatutoryIdEntity', 'legalEntity')
  statutoryIds?: LegalEntityStatutoryIdEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;
}
