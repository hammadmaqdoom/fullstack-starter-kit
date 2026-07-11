import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import {
  DocumentAudience,
  DocumentTemplateStatus,
  DocumentType,
} from '../enums/setup-wizard.enum';

@Entity('document_templates')
@Index('IDX_document_templates_tenant_code', ['tenantId', 'code'], {
  unique: true,
})
export class DocumentTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string | null;

  @Column({
    type: 'enum',
    enum: DocumentType,
    enumName: 'document_type_enum',
  })
  documentType: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentAudience,
    enumName: 'document_audience_enum',
    default: DocumentAudience.EMPLOYEE,
  })
  audience: DocumentAudience;

  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  employmentTypeId: string | null;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  @Column({
    type: 'enum',
    enum: DocumentTemplateStatus,
    enumName: 'document_template_status_enum',
    default: DocumentTemplateStatus.ACTIVE,
  })
  status: DocumentTemplateStatus;

  /** Inverse side — string relation name avoids circular import with version entity. */
  @OneToMany('DocumentTemplateVersionEntity', 'template')
  versions?: Array<{
    id: string;
    version: number;
    body: string;
    status: string;
    mergeFieldSchema: Record<string, unknown>;
    publishedAt: Date | null;
    createdAt: Date;
  }>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
