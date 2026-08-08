import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateVisaAttachmentDto,
  CreateWorkerPassportDto,
  CreateWorkerVisaRecordDto,
} from './dto/pre-boarding.dto';
import { WorkerImmigrationService } from './worker-immigration.service';

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('workers-immigration')
@Controller({ path: 'workers', version: '1' })
@UseGuards(AuthGuard)
export class WorkerImmigrationController {
  constructor(private readonly immigrationService: WorkerImmigrationService) {}

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

  @Get(':workerId/passports')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'List worker passports' })
  listPassports(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.immigrationService.listPassports(workerId, session.user.id);
  }

  @Post(':workerId/passports')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Add worker passport' })
  createPassport(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Body() dto: CreateWorkerPassportDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.immigrationService.createPassport(
      workerId,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get(':workerId/visa-records')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'List worker visa / work-pass records' })
  listVisaRecords(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.immigrationService.listVisaRecords(workerId, session.user.id);
  }

  @Post(':workerId/visa-records')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Add visa / work-pass record' })
  createVisaRecord(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Body() dto: CreateWorkerVisaRecordDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.immigrationService.createVisaRecord(
      workerId,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':workerId/visa-records/:recordId/attachments')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Upload visa/passport attachment' })
  addAttachment(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: CreateVisaAttachmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.immigrationService.addAttachment(
      workerId,
      recordId,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
