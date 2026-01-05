import { VerificationPlatform } from '../entities/site-verification.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSiteVerificationDto {
  @IsEnum(VerificationPlatform)
  @IsNotEmpty()
  platform: VerificationPlatform;

  @IsString()
  @IsNotEmpty()
  verificationCode: string;

  @IsString()
  @IsOptional()
  metaTag?: string;
}

