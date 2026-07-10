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
  RemittanceCorridorAppliesTo,
  RemittanceDocumentType,
} from '../enums/remittance.enum';

/**
 * FLW-PAY-005 — checklist per payer-country x beneficiary-bank-country
 * corridor. `legalEntityId` null means the corridor applies tenant-wide for
 * that country pair; a legal-entity-specific row takes precedence.
 */
@Entity('remittance_corridor_configs')
@Index('IDX_remittance_corridor_configs_lookup', [
  'tenantId',
  'payerCountryCode',
  'beneficiaryBankCountryCode',
  'isActive',
])
export class RemittanceCorridorConfigEntity {
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
  beneficiaryBankCountryCode: string;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId: string | null;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity;

  @Column({
    type: 'enum',
    enum: RemittanceCorridorAppliesTo,
    enumName: 'remittance_corridor_applies_to_enum',
    default: RemittanceCorridorAppliesTo.ALL,
  })
  appliesTo: RemittanceCorridorAppliesTo;

  @Column({ type: 'jsonb', default: [] })
  requiredDocTypes: RemittanceDocumentType[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
