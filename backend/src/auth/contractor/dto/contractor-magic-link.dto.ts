import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContractorMagicLinkDto {
  @ApiProperty({ example: 'contractor@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '/dashboard' })
  @IsOptional()
  @IsString()
  callbackURL?: string;
}
