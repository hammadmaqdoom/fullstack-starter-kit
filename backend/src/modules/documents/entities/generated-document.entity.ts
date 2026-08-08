import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DocumentTemplateVersionEntity } from '@/modules/country-config/entities/document-template-version.entity';
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
import { GeneratedDocumentStatus } from '../enums/document.enum';
import { LetterheadConfigEntity } from './letterhead-config.entity';

@Entity('generated_documents')
@Index('IDX_generated_documents_worker_status', [
  'tenantId',
  'workerId',
  'status',
])
export class GeneratedDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'uuid' })
  templateVersionId: string;

  @ManyToOne(() => DocumentTemplateVersionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'templateVersionId' })
  templateVersion?: DocumentTemplateVersionEntity;

  @Column({
    type: 'enum',
    enum: GeneratedDocumentStatus,
    enumName: 'generated_document_status_enum',
    default: GeneratedDocumentStatus.DRAFT,
  })
  status: GeneratedDocumentStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  blobUrl: string | null;

  @Column({ type: 'jsonb', default: {} })
  mergeData: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  templateSnapshot: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId: string | null;

  /** Assigned once, at Issue only — immutable, never reused (PRD §6.8.4). Null while Draft. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  documentNumber: string | null;

  @Column({ type: 'uuid', nullable: true })
  letterheadConfigId: string | null;

  @ManyToOne(() => LetterheadConfigEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'letterheadConfigId' })
  letterheadConfig?: LetterheadConfigEntity;

  @Column({ type: 'uuid', nullable: true })
  issuedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  issuedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
