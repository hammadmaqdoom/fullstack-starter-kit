import { IsArray, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateComplianceProgrammeDto {
  @IsOptional()
  @IsDateString()
  evidenceWindowStart?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetFrameworks?: string[];

  @IsOptional()
  @IsDateString()
  nextAuditTargetDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateControlEvidenceLinkDto {
  @IsString()
  @MaxLength(255)
  label!: string;

  @IsString()
  urlOrPath!: string;
}

export class QueryControlsDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  inScope?: string;
}
