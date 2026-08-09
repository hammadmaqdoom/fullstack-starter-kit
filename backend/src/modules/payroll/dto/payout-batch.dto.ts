import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { PayoutBatchType, PayoutRail } from '../enums/payout.enum';

export class PreviewPayoutBatchDto {
  @ApiProperty({ enum: PayoutBatchType })
  @IsEnum(PayoutBatchType)
  batchType!: PayoutBatchType;

  @ApiProperty()
  @IsUUID()
  legalEntityId!: string;

  @ApiPropertyOptional({
    description: 'payRunId or contractorBatchId depending on batchType',
  })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  expenseClaimIds?: string[];
}

export class CreatePayoutBatchDto extends PreviewPayoutBatchDto {
  @ApiProperty({ enum: PayoutRail })
  @IsEnum(PayoutRail)
  rail!: PayoutRail;

  @ApiProperty()
  @IsUUID()
  fundingAccountId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  csvExportProfileId?: string;
}

export class ConfirmManualPaidDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        lineId: { type: 'string' },
        paymentReference: { type: 'string' },
      },
    },
  })
  @IsArray()
  @ArrayMinSize(1)
  refs!: Array<{ lineId: string; paymentReference: string }>;
}
