import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class OpenAccessReviewCycleDto {
  @ApiProperty({ example: '2026-Q3', description: 'Free-form period label, e.g. 2026-Q3' })
  @IsString()
  @Matches(/^\d{4}-Q[1-4]$/)
  periodLabel: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class ReviewAccessReviewItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AccessReviewEvidenceQueryDto {
  @ApiProperty()
  @IsUUID()
  cycleId: string;
}
