import { Environment } from '../entities/analytics-config.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateFeatureFlagDto {
  @IsString()
  @IsNotEmpty()
  flagName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsEnum(Environment)
  @IsOptional()
  environment?: Environment;
}

