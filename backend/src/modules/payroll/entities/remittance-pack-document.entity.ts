import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RemittancePackEntity } from './remittance-pack.entity';
import {
  RemittanceDocumentSource,
  RemittanceDocumentStatus,
  RemittanceDocumentType,
} from '../enums/remittance.enum';

/**
 * FLW-PAY-005 — one row per required (or extra) document on a remittance
 * pack. Rows are seeded `pending`/`auto` when the pack is created from the
 * corridor checklist, then flipped to `available` by Finance/contractor
 * upload.
 */
@Entity('remittance_pack_documents')
@Index('IDX_remittance_pack_documents_pack', ['tenantId', 'packId'])
export class RemittancePackDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  packId: string;

  @ManyToOne(() => RemittancePackEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packId' })
  pack?: RemittancePackEntity;

  @Column({
    type: 'enum',
    enum: RemittanceDocumentType,
    enumName: 'remittance_document_type_enum',
  })
  documentType: RemittanceDocumentType;

  @Column({
    type: 'enum',
    enum: RemittanceDocumentSource,
    enumName: 'remittance_document_source_enum',
    default: RemittanceDocumentSource.AUTO,
  })
  source: RemittanceDocumentSource;

  @Column({ type: 'varchar', length: 500, nullable: true })
  blobUrl: string | null;

  @Column({
    type: 'enum',
    enum: RemittanceDocumentStatus,
    enumName: 'remittance_document_status_enum',
    default: RemittanceDocumentStatus.PENDING,
  })
  status: RemittanceDocumentStatus;

  @Column({ type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  uploadedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
