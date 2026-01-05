import { BaseModel } from '@/database/models/base.model';
import { ContentEntity } from '@/api/content/entities/content.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export enum SchemaType {
  ARTICLE = 'Article',
  BLOG_POSTING = 'BlogPosting',
  WEB_PAGE = 'WebPage',
  BREADCRUMB_LIST = 'BreadcrumbList',
  ORGANIZATION = 'Organization',
  PERSON = 'Person',
  PRODUCT = 'Product',
  FAQ_PAGE = 'FAQPage',
  HOW_TO = 'HowTo',
  CUSTOM = 'Custom',
}

@Entity('json_ld_schemas')
export class JsonLdSchemaEntity extends BaseModel {
  @Column({
    type: 'enum',
    enum: SchemaType,
    default: SchemaType.CUSTOM,
  })
  schemaType: SchemaType;

  @Column({ type: 'jsonb' })
  schemaData: Record<string, any>;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  contentId?: string;

  @ManyToOne(
    () => ContentEntity,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'contentId' })
  content?: ContentEntity;

  @Column({ type: 'boolean', default: false })
  isGlobal: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

