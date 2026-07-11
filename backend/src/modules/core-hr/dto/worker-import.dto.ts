import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ImportWorkersCsvDto {
  @ApiProperty({ description: 'Raw CSV content, header row + one row per worker' })
  @IsString()
  @MinLength(1)
  csv: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;
}
