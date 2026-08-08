import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CandidateUpsertPreBoardingFieldDto,
  SubmitPreBoardingConsentDto,
  SubmitPreBoardingPacketDto,
} from './dto/pre-boarding.dto';
import { PreBoardingService } from './pre-boarding.service';

/**
 * FLW-TAL-006 — candidate-facing pre-boarding endpoints. Authenticated by a
 * magic-link token (see PreBoardingService.resolvePacketByToken), never a
 * Better Auth session — every route here is @PublicAuth() by design.
 */
@ApiTags('pre-boarding-candidate')
@Controller({ path: 'pre-boarding/candidate', version: '1' })
@PublicAuth()
export class PreBoardingCandidateController {
  constructor(private readonly preBoardingService: PreBoardingService) {}

  @Get('packet')
  @ApiOperation({ summary: 'Get pre-boarding packet by magic-link token' })
  getPacket(@Query('token') token: string) {
    return this.preBoardingService.getPacketForCandidate(token);
  }

  @Post('consent')
  @ApiOperation({ summary: 'Submit consent acknowledgement' })
  submitConsent(
    @Body() dto: SubmitPreBoardingConsentDto,
    @Req() request: FastifyRequest,
  ) {
    return this.preBoardingService.submitConsentAsCandidate(
      dto.token,
      dto.acknowledged,
      request.ip,
    );
  }

  @Post('fields')
  @ApiOperation({ summary: 'Upsert a pre-boarding field value' })
  upsertField(
    @Body() dto: CandidateUpsertPreBoardingFieldDto,
    @Req() request: FastifyRequest,
  ) {
    return this.preBoardingService.upsertFieldAsCandidate(
      dto.token,
      dto,
      request.ip,
    );
  }

  @Post('attachments')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an attachment (passport/visa scan, etc.)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10e6 } }))
  uploadAttachment(
    @Query('token') token: string,
    @Query('fieldKey') fieldKey: string,
    @UploadedFile() file: File,
    @Req() request: FastifyRequest,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'ATTACHMENT_REQUIRED',
        message: 'A file is required',
      });
    }
    return this.preBoardingService.uploadAttachmentAsCandidate(
      token,
      fieldKey,
      file,
      request.ip,
    );
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit the completed pre-boarding packet' })
  submitPacket(
    @Body() dto: SubmitPreBoardingPacketDto,
    @Req() request: FastifyRequest,
  ) {
    return this.preBoardingService.submitPacketAsCandidate(
      dto.token,
      request.ip,
    );
  }
}
