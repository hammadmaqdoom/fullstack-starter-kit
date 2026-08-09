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
import { ExportFileFormat } from '../enums/payroll.enum';

export interface ExportColumnMapping {
  key: string;
  header: string;
}

/**
 * Column-mapping template for Finance export packs (PRD §6.12.5, §6.21,
 * FLW-PAY-001 step 5). `legalEntityId`/`countryCode` are nullable so a
 * profile can act as a tenant-wide or country-wide default; the most
 * specific match wins during resolution (see `ExportService`).
 */
@Entity('finance_export_profiles')
@Index('IDX_finance_export_profiles_tenant', ['tenantId'])
@Index('IDX_finance_export_profiles_scope', [
  'tenantId',
  'legalEntityId',
  'countryCode',
])
export class FinanceExportProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId: string | null;

  @ManyToOne(() => LegalEntityEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity | null;

  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'pay_run' })
  exportType: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb', default: [] })
  columnMappings: ExportColumnMapping[];

  @Column({
    type: 'jsonb',
    default: [ExportFileFormat.XLSX, ExportFileFormat.PDF],
  })
  fileFormats: ExportFileFormat[];

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
