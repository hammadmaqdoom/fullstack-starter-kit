import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExpenseCategory, ExpenseClaimStatus, ExpenseSettlementMode } from '../enums/expense.enum';

export class ExpenseClaimLineDto {
  @ApiProperty({ example: 'Taxi to client site' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 45.5 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}

export class CreateExpenseClaimDto {
  @ApiPropertyOptional({
    description: 'Omit when the employee is submitting their own claim.',
  })
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiPropertyOptional({
    description: 'Links this claim to an approved travel request (§6.17.3).',
  })
  @IsOptional()
  @IsUUID()
  travelRequestId?: string;

  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiPropertyOptional({
    description:
      'Required when lines are omitted. When lines are provided, the amount is computed as their sum.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  @IsString()
  @MaxLength(3)
  currencyCode: string;

  @ApiProperty()
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptBlobUrl?: string;

  @ApiPropertyOptional({ type: [ExpenseClaimLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseClaimLineDto)
  lines?: ExpenseClaimLineDto[];
}

export class UpdateExpenseClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  travelRequestId?: string;

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptBlobUrl?: string;

  @ApiPropertyOptional({ type: [ExpenseClaimLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseClaimLineDto)
  lines?: ExpenseClaimLineDto[];
}

export class QueryExpenseClaimsDto extends PageOptionsDto {
  @StringFieldOptional()
  workerId?: string;

  @ApiPropertyOptional({ enum: ExpenseClaimStatus })
  @IsOptional()
  @IsEnum(ExpenseClaimStatus)
  status?: ExpenseClaimStatus;

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}

export class RejectExpenseClaimDto {
  @ApiProperty({ example: 'Missing receipt for amount above policy threshold' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class ApproveFinanceExpenseDto {
  @ApiPropertyOptional({ enum: ExpenseSettlementMode })
  @IsOptional()
  @IsEnum(ExpenseSettlementMode)
  settlementMode?: ExpenseSettlementMode;
}

export class UpsertExpensePolicyDto {
  @ApiProperty({ minLength: 2, maxLength: 2, example: 'PK' })
  @IsString()
  @MaxLength(2)
  countryCode: string;

  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyCap?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCap?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  receiptRequiredAbove?: number;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  @IsString()
  @MaxLength(3)
  currencyCode: string;
}
