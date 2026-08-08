import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ExitInterviewStatus,
  PassportSource,
  VisaApplicationStatus,
  VisaAttachmentType,
  VisaRecordType,
} from '../enums/onboarding.enum';

export class CreatePreBoardingPacketDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty({ example: 'candidate@personal.example' })
  @IsEmail()
  personalEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateVersionId?: string;
}

export class UpsertPreBoardingFieldDto {
  @ApiProperty({ example: 'passport_number' })
  @IsString()
  @MaxLength(100)
  fieldKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valueText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  attachmentBlobId?: string;
}

export class PreBoardingCandidateTokenDto {
  @ApiProperty({ description: 'Magic-link token from the invite email' })
  @IsString()
  token: string;
}

export class SubmitPreBoardingConsentDto extends PreBoardingCandidateTokenDto {
  @ApiProperty()
  @IsBoolean()
  acknowledged: boolean;
}

export class CandidateUpsertPreBoardingFieldDto extends PreBoardingCandidateTokenDto {
  @ApiProperty({ example: 'passport_number' })
  @IsString()
  @MaxLength(100)
  fieldKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valueText?: string;
}

export class SubmitPreBoardingPacketDto extends PreBoardingCandidateTokenDto {}

export class CreateWorkerPassportDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  passportNumber: string;

  @ApiProperty({ example: 'PK' })
  @IsString()
  @MaxLength(2)
  nationalityCode: string;

  @ApiProperty({ example: 'PK' })
  @IsString()
  @MaxLength(2)
  issuingCountryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  placeOfIssue?: string;

  @ApiProperty({ example: '2020-01-15' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: '2030-01-14' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ enum: PassportSource })
  @IsOptional()
  @IsEnum(PassportSource)
  source?: PassportSource;
}

export class CreateWorkerVisaRecordDto {
  @ApiProperty({
    example: 'AE',
    description: 'ISO country code from country-config',
  })
  @IsString()
  @MaxLength(2)
  countryCode: string;

  @ApiProperty({ enum: VisaRecordType })
  @IsEnum(VisaRecordType)
  recordType: VisaRecordType;

  @ApiProperty({ example: 'never_had_uae_visa' })
  @IsString()
  @MaxLength(50)
  statusCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  visaOrPassType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sponsorOrEmployer?: string;

  @ApiPropertyOptional({ enum: VisaApplicationStatus })
  @IsOptional()
  @IsEnum(VisaApplicationStatus)
  applicationStatus?: VisaApplicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  passportId?: string;
}

export class CreateVisaAttachmentDto {
  @ApiProperty({ enum: VisaAttachmentType })
  @IsEnum(VisaAttachmentType)
  attachmentType: VisaAttachmentType;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  blobUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  passportId?: string;
}

export class UpsertExitInterviewDto {
  @ApiPropertyOptional({
    description: 'Form responses — restricted to People Ops',
    example: { reasonForLeaving: 'Career growth', wouldRecommend: true },
  })
  @IsOptional()
  @IsObject()
  responses?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ExitInterviewStatus })
  @IsOptional()
  @IsEnum(ExitInterviewStatus)
  status?: ExitInterviewStatus;
}
