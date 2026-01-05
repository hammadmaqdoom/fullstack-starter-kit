import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { ContentEntity } from '@/api/content/entities/content.entity';

@Entity('seo_metadata')
export class SeoMetadataEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  contentId?: string;

  @OneToOne(() => ContentEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'contentId' })
  content?: ContentEntity;

  // Basic meta
  @Column({ type: 'varchar', length: 255, nullable: true })
  metaTitle?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  metaKeywords?: string;

  // Open Graph
  @Column({ type: 'varchar', length: 255, nullable: true })
  ogTitle?: string;

  @Column({ type: 'text', nullable: true })
  ogDescription?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  ogImage?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ogType?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ogUrl?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ogSiteName?: string;

  // Twitter Card
  @Column({ type: 'varchar', length: 50, nullable: true })
  twitterCard?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  twitterSite?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  twitterCreator?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  twitterImage?: string;

  // Canonical
  @Column({ type: 'varchar', length: 500, nullable: true })
  canonicalUrl?: string;

  // Hreflang
  @Column({ type: 'jsonb', nullable: true })
  hreflang?: Array<{
    locale: string;
    url: string;
  }>;

  // Custom meta tags
  @Column({ type: 'jsonb', nullable: true })
  customMeta?: Array<{
    name: string;
    content: string;
  }>;
}

