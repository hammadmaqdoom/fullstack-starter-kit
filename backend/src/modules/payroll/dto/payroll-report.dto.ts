import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class PayrollRegisterQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}

export class PayrollDeductionsQueryDto extends PayrollRegisterQueryDto {}

export class PayrollVarianceQueryDto {
  @ApiPropertyOptional({
    description: 'Pay run to evaluate — compared against the most recent prior approved run for the same legal entity',
  })
  @IsUUID()
  payRunId: string;
}
