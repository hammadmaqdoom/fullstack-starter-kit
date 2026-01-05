import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ContentEntity } from '@/api/content/entities/content.entity';

export enum SchemaType {
  ORGANIZATION = 'Organization',
  WEBSITE = 'WebSite',
  WEBPAGE = 'WebPage',
  BREADCRUMBLIST = 'BreadcrumbList',
  ARTICLE = 'Article',
  BLOGPOSTING = 'BlogPosting',
  NEWSARTICLE = 'NewsArticle',
  TECHARTICLE = 'TechArticle',
  FAQPAGE = 'FAQPage',
  HOWTO = 'HowTo',
  LOCALBUSINESS = 'LocalBusiness',
  PRODUCT = 'Product',
  SERVICE = 'Service',
  REVIEW = 'Review',
  RATING = 'Rating',
  OFFER = 'Offer',
  EVENT = 'Event',
  COURSE = 'Course',
  RECIPE = 'Recipe',
  VIDEOOBJECT = 'VideoObject',
  IMAGEOBJECT = 'ImageObject',
  PERSON = 'Person',
  JOBPOSTING = 'JobPosting',
}

@Entity('json_ld_schemas')
export class JsonLdSchemaEntity extends BaseModel {
  @Column({
    type: 'enum',
    enum: SchemaType,
  })
  schemaType: SchemaType;

  @Column({ type: 'jsonb' })
  schemaData: Record<string, any>;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  contentId?: string;

  @ManyToOne(() => ContentEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'contentId' })
  content?: ContentEntity;

  @Column({ type: 'boolean', default: false })
  isGlobal: boolean;
}

