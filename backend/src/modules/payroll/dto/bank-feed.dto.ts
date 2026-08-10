import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BankFeedMatchStatus } from '../enums/payout.enum';

export class SyncBankFeedDto {
  @ApiProperty()
  @IsUUID()
  fundingAccountId!: string;
}

export class QueryBankFeedsDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: BankFeedMatchStatus })
  @IsOptional()
  @IsEnum(BankFeedMatchStatus)
  matchStatus?: BankFeedMatchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fundingAccountId?: string;
}

export class MatchBankFeedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payoutBatchLineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cardTransactionId?: string;
}
