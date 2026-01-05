import { ContentType, ContentStatus } from '../entities/content.entity';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';

export class QueryContentDto extends PageOptionsDto {
  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType;

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  tagSlug?: string;

  @IsUUID()
  @IsOptional()
  authorId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}

