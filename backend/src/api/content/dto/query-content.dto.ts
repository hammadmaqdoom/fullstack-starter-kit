import { ContentType, ContentStatus } from '../entities/content.entity';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/offset-pagination.dto';

export class QueryContentDto extends OffsetPaginationDto {
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

