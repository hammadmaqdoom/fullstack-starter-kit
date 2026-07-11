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
import { DocumentTemplateVersionStatus } from '../enums/setup-wizard.enum';
import { DocumentTemplateEntity } from './document-template.entity';

@Entity('document_template_versions')
@Index(
  'IDX_document_template_versions_tenant_template_version',
  ['tenantId', 'templateId', 'version'],
  { unique: true },
)
@Index('IDX_document_template_versions_status', [
  'tenantId',
  'templateId',
  'status',
])
export class DocumentTemplateVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  templateId: string;

  @ManyToOne(() => DocumentTemplateEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template?: DocumentTemplateEntity;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', default: {} })
  mergeFieldSchema: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: DocumentTemplateVersionStatus,
    enumName: 'document_template_version_status_enum',
    default: DocumentTemplateVersionStatus.DRAFT,
  })
  status: DocumentTemplateVersionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  publishedBy: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
