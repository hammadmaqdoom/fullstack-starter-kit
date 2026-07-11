import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class QueryAuditLogDto extends PageOptionsDto {
  @StringFieldOptional()
  entityType?: string;

  @StringFieldOptional()
  entityId?: string;

  @StringFieldOptional()
  actorId?: string;

  @StringFieldOptional()
  action?: string;

  @ApiPropertyOptional({
    description: 'Inclusive ISO-8601 lower bound on createdAt',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Inclusive ISO-8601 upper bound on createdAt',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
