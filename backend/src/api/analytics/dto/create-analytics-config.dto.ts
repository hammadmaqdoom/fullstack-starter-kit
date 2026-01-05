import { AnalyticsPlatform, Environment } from '../entities/analytics-config.entity';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateAnalyticsConfigDto {
  @IsEnum(AnalyticsPlatform)
  @IsNotEmpty()
  platform: AnalyticsPlatform;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  trackingId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(Environment)
  @IsOptional()
  environment?: Environment;

  @IsObject()
  @IsOptional()
  additionalConfig?: Record<string, any>;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}

