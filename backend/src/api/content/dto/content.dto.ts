import { ContentEntity, ContentType, ContentStatus } from '../entities/content.entity';
import { CategoryEntity } from '../entities/category.entity';
import { TagEntity } from '../entities/tag.entity';
import { UserDto } from '@/api/user/dto/user.dto';

export class ContentDto {
  id: string;
  title: string;
  slug: string;
  content: string;
  type: ContentType;
  status: ContentStatus;
  publishedAt?: Date;
  excerpt?: string;
  featuredImage?: string;
  readingTime?: number;
  authorId: string;
  author?: UserDto;
  categoryId?: string;
  category?: CategoryEntity;
  tags?: TagEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export function toContentDto(entity: ContentEntity): ContentDto {
  return {
    id: entity.id,
    title: entity.title,
    slug: entity.slug,
    content: entity.content,
    type: entity.type,
    status: entity.status,
    publishedAt: entity.publishedAt,
    excerpt: entity.excerpt,
    featuredImage: entity.featuredImage,
    readingTime: entity.readingTime,
    authorId: entity.authorId,
    author: entity.author ? (entity.author as any) : undefined,
    categoryId: entity.categoryId,
    category: entity.category,
    tags: entity.tags,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

