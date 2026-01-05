import { ContentType, ContentStatus } from '../entities/content.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}

