import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryHubDto {
  @ApiPropertyOptional({ enum: ['mine', 'for_me'] })
  @IsOptional()
  @IsIn(['mine', 'for_me'])
  tab?: 'mine' | 'for_me';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateHubSavedViewDto {
  @ApiProperty({ example: 'Pending approvals' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: { type: 'profile_change_request', status: 'submitted' },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
