import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { CorporateCardProvider } from '../enums/payout.enum';
import { ExpenseCategory } from '@/modules/operations/enums/expense.enum';

export class IssueCorporateCardDto {
  @ApiProperty()
  @IsUUID()
  legalEntityId!: string;

  @ApiProperty({ enum: CorporateCardProvider })
  @IsEnum(CorporateCardProvider)
  provider!: CorporateCardProvider;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiProperty({ example: 'SGD' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ example: '1000.00' })
  @IsString()
  spendLimit!: string;

  @ApiProperty()
  @IsUUID()
  fundingAccountId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  travelRequestId?: string;
}

export class AllocateCardTransactionDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  costCentre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
