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
import { DocumentTemplateEntity } from './document-template.entity';

@Entity('document_template_versions')
@Index(
  'IDX_document_template_versions_tenant_template_version',
  ['tenantId', 'templateId', 'version'],
  { unique: true },
)
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

  @ManyToOne(() => DocumentTemplateEntity, (template) => template.versions, {
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

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
