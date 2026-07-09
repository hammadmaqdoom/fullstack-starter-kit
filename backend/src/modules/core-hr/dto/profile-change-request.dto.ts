import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ProfileFieldChange } from '../entities/profile-change-request.entity';

export class SubmitProfileChangeRequestDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: { old: {}, new: {} },
    },
  })
  @IsObject()
  fieldChanges: ProfileFieldChange;
}

export class RejectProfileChangeRequestDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

export class ApproveProfileChangeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
