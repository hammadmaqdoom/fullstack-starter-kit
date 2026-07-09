import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';
import { SetupWizardStep } from '../enums/setup-wizard.enum';

export class SaveSetupWizardStepDto {
  @ApiProperty({ enum: SetupWizardStep })
  @IsEnum(SetupWizardStep)
  step: SetupWizardStep;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  skip?: boolean;
}

export class ApplySetupWizardSeedDto {
  @ApiPropertyOptional({
    description: 'Limit seeding to specific countries',
    example: ['PK', 'AE', 'SG'],
  })
  @IsOptional()
  countryCodes?: string[];
}
