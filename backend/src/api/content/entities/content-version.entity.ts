import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ContentEntity } from './content.entity';

@Entity('content_versions')
export class ContentVersionEntity extends BaseModel {
  @Index({ where: '"deletedAt" IS NULL' })
  @Column()
  contentId: string;

  @ManyToOne(
    () => ContentEntity,
    (content) => content.versions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'contentId' })
  content: ContentEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  contentData: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  excerpt?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  versionNumber?: string;

  @Column({ type: 'text', nullable: true })
  changeNote?: string;
}

