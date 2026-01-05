import { ScriptPosition } from '../entities/custom-script.entity';
import { Environment } from '../entities/analytics-config.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsInt, Min, IsObject, IsArray } from 'class-validator';

export class CreateCustomScriptDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  scriptContent: string;

  @IsEnum(ScriptPosition)
  @IsOptional()
  position?: ScriptPosition;

  @IsObject()
  @IsOptional()
  targetPages?: {
    type: 'all' | 'specific';
    paths?: string[];
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contentTypes?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(Environment)
  @IsOptional()
  environment?: Environment;
}

