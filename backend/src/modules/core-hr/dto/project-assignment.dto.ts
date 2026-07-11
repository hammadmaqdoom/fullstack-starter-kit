import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateProjectAssignmentDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  projectName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectLeadId?: string;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ description: 'Omit for an ongoing assignment' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateProjectAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectLeadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Pass null to reopen an end-dated assignment',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class QueryProjectAssignmentsDto extends PageOptionsDto {
  @StringFieldOptional()
  workerId?: string;
}
