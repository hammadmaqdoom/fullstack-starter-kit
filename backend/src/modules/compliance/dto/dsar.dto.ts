import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ExportDsarDto {
  @ApiProperty({ description: 'Worker whose data is being exported (identity-verified by People Ops)' })
  @IsUUID()
  workerId: string;

  @ApiPropertyOptional({ description: 'Reason / DSAR request reference, for the audit trail' })
  @IsOptional()
  @IsString()
  reason?: string;
}
