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
} from 'typeorm';

export interface LetterheadLayoutJson {
  logo?: { position?: string; maxHeightPx?: number };
  header?: {
    showRegisteredName?: boolean;
    showTradingName?: boolean;
    showAddress?: boolean;
  };
  footer?: { showPageNumbers?: boolean; customText?: string };
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  physicalStock?: {
    enabled?: boolean;
    contentTopMarginMm?: number;
    contentBottomMarginMm?: number;
    showPrintWatermark?: boolean;
  };
}

/**
 * Versioned letterhead layout, separate from `legal_entities` master data.
 * Edits create a new version; issued documents keep an immutable snapshot
 * reference via `generated_documents.letterheadConfigId` (PRD §6.8.1).
 */
@Entity('letterhead_configs')
@Index(
  'IDX_letterhead_configs_tenant_entity_version',
  ['tenantId', 'legalEntityId', 'version'],
  { unique: true },
)
@Index('IDX_letterhead_configs_current', [
  'tenantId',
  'legalEntityId',
  'isCurrent',
])
export class LetterheadConfigEntity {
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

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb', default: {} })
  layoutJson: LetterheadLayoutJson;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoBlobUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  previewBlobUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({ type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ type: 'timestamptz', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
