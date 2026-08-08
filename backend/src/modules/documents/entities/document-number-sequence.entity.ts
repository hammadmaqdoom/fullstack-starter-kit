import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Atomic counter scoped per (tenant, legal entity, document type, year) — PRD §6.8.4. */
@Entity('document_number_sequences')
@Index(
  'IDX_document_number_sequences_scope',
  ['tenantId', 'legalEntityId', 'documentType', 'year'],
  { unique: true },
)
export class DocumentNumberSequenceEntity {
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

  @Column({ type: 'varchar', length: 30 })
  documentType: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int', default: 0 })
  lastSeq: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
