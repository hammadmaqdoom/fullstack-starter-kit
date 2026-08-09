import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CompleteSigningWithTokenDto,
  CreateEsignEnvelopeDto,
  IssueSigningTokenDto,
  ManualUploadEsignDto,
  SignEsignEnvelopeDto,
  VoidEsignEnvelopeDto,
} from './dto/esign.dto';
import { EsignService } from './esign.service';

const ESIGN_READ_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

const ESIGN_MANAGE_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('esign')
@Controller({ path: 'esign', version: '1' })
@UseGuards(AuthGuard)
export class EsignController {
  constructor(private readonly esignService: EsignService) {}

  private actor(
    session: CurrentUserSession,
    correlationId?: string,
    request?: FastifyRequest,
  ) {
    return {
      userId: session.user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: request?.ip,
    };
  }

  @Post('envelopes')
  @Roles(...ESIGN_MANAGE_ROLES)
  @ApiOperation({ summary: 'Create e-sign envelope (FLW-DOC-003)' })
  create(
    @Body() dto: CreateEsignEnvelopeDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.create(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('envelopes')
  @Roles(...ESIGN_READ_ROLES)
  @ApiOperation({
    summary: 'List envelopes awaiting the current worker signature',
  })
  listPending(@CurrentUserSession() session: CurrentUserSession) {
    return this.esignService.listPending(this.actor(session));
  }

  @Get('envelopes/:id')
  @Roles(...ESIGN_READ_ROLES)
  @ApiOperation({ summary: 'Get envelope detail + status tracker' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.esignService.findOne(id, this.actor(session));
  }

  @Post('envelopes/:id/send')
  @Roles(...ESIGN_MANAGE_ROLES)
  @ApiOperation({ summary: 'Send envelope to signatories' })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.send(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post('envelopes/:id/sign')
  @Roles(...ESIGN_READ_ROLES)
  @ApiOperation({ summary: 'Record signature stub for a signatory' })
  sign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignEsignEnvelopeDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.sign(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('envelopes/:id/void')
  @Roles(...ESIGN_MANAGE_ROLES)
  @ApiOperation({ summary: 'Void envelope with reason' })
  voidEnvelope(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidEsignEnvelopeDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.void(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('envelopes/:id/audit')
  @Roles(...ESIGN_READ_ROLES, PolarisRoleCode.FINANCE)
  @ApiOperation({ summary: 'Append-only e-sign audit trail' })
  getAudit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.esignService.getAudit(id, this.actor(session));
  }

  @Get('envelopes/:id/export-pdf')
  @Roles(...ESIGN_MANAGE_ROLES)
  @ApiOperation({ summary: 'Export PDF for wet signature (manual peer path)' })
  exportPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.exportPdf(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post('envelopes/:id/manual-upload')
  @Roles(...ESIGN_MANAGE_ROLES)
  @ApiOperation({ summary: 'Upload wet-signed copy (manual peer path)' })
  manualUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualUploadEsignDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.manualUpload(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('envelopes/:id/certificate')
  @Roles(...ESIGN_READ_ROLES, PolarisRoleCode.FINANCE)
  @ApiOperation({ summary: 'Certificate of Completion (PDF stub + audit)' })
  certificate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.generateCertificateOfCompletion(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post('envelopes/:id/signing-tokens')
  @Roles(...ESIGN_MANAGE_ROLES)
  @ApiOperation({
    summary: 'Issue contractor email-verified signing token',
  })
  issueToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssueSigningTokenDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.issueSigningToken(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @PublicAuth()
  @Get('sign')
  @ApiOperation({ summary: 'Validate email-verified signing token' })
  validateToken(@Query('token') token: string) {
    return this.esignService.validateSigningToken(token);
  }

  @PublicAuth()
  @Post('sign/complete')
  @ApiOperation({ summary: 'Complete signing with email-verified token' })
  completeWithToken(
    @Body() dto: CompleteSigningWithTokenDto,
    @Req() request?: FastifyRequest,
  ) {
    return this.esignService.completeWithToken(dto, request?.ip);
  }
}
