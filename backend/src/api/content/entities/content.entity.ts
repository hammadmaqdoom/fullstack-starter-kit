import { UserEntity } from '@/auth/entities/user.entity';
import { BaseModel } from '@/database/models/base.model';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { TagEntity } from './tag.entity';

export enum ContentType {
  BLOG = 'blog',
  PAGE = 'page',
  DOCS = 'docs',
  CHANGELOG = 'changelog',
}

export enum ContentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('contents')
export class ContentEntity extends BaseModel {
  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ContentType,
  })
  type: ContentType;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  excerpt?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  featuredImage?: string;

  @Column({ type: 'int', default: 0 })
  readingTime?: number;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column()
  authorId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'authorId' })
  author: UserEntity;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  categoryId?: string;

  @ManyToOne(() => CategoryEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category?: CategoryEntity;

  @ManyToMany(() => TagEntity, (tag) => tag.contents)
  @JoinTable({
    name: 'content_tags',
    joinColumn: { name: 'contentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags?: TagEntity[];

  @OneToMany(
    'ContentVersionEntity',
    'content',
  )
  versions?: any[];
}

