import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  HelpDeskPriority,
  HelpDeskQueue,
  HelpDeskStatus,
} from '../enums/help-desk.enum';

export class CreateHelpDeskTicketDto {
  @ApiProperty({ enum: HelpDeskQueue })
  @IsEnum(HelpDeskQueue)
  queue: HelpDeskQueue;

  @ApiProperty({ example: 'Laptop will not power on' })
  @IsString()
  @MaxLength(255)
  subject: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: HelpDeskPriority, default: HelpDeskPriority.P3 })
  @IsOptional()
  @IsEnum(HelpDeskPriority)
  priority?: HelpDeskPriority;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateHelpDeskTicketDto {
  @ApiPropertyOptional({ enum: HelpDeskPriority })
  @IsOptional()
  @IsEnum(HelpDeskPriority)
  priority?: HelpDeskPriority;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class AssignTicketDto {
  @ApiProperty()
  @IsUUID()
  assigneeId: string;
}

export class QueryHelpDeskTicketsDto extends PageOptionsDto {
  @StringFieldOptional()
  requesterId?: string;

  @ApiPropertyOptional({ enum: HelpDeskQueue })
  @IsOptional()
  @IsEnum(HelpDeskQueue)
  queue?: HelpDeskQueue;

  @ApiPropertyOptional({ enum: HelpDeskStatus })
  @IsOptional()
  @IsEnum(HelpDeskStatus)
  status?: HelpDeskStatus;

  @ApiPropertyOptional({ description: 'Only tickets unassigned in the queue' })
  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;
}

export class CreateTicketCommentDto {
  @ApiProperty({ example: 'Please share a screenshot of the error' })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Internal notes are never shown to the requester',
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class ResolveTicketDto {
  @ApiProperty({
    example: 'Replaced faulty charger. Confirmed laptop powers on.',
    description: 'Mandatory resolution notes (FLW-OPS-003 step 4)',
  })
  @IsString()
  @MaxLength(2000)
  resolutionNotes: string;
}

export class UpsertHelpDeskSlaPolicyDto {
  @ApiProperty({ enum: HelpDeskQueue })
  @IsEnum(HelpDeskQueue)
  queue: HelpDeskQueue;

  @ApiProperty({ enum: HelpDeskPriority })
  @IsEnum(HelpDeskPriority)
  priority: HelpDeskPriority;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(720)
  slaTargetHours: number;
}
