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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateExportProfileDto,
  QueryExportProfilesDto,
} from './dto/export-profile.dto';
import { ExportPayRunDto } from './dto/export.dto';
import { ExportService } from './export.service';

const PAYROLL_EXPORT_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('payroll')
@Controller({ path: 'payroll', version: '1' })
@UseGuards(AuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

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

  @Post('export-profiles')
  @Roles(...PAYROLL_EXPORT_ROLES)
  @ApiOperation({ summary: 'Create a Finance export column-mapping profile' })
  createExportProfile(
    @Body() dto: CreateExportProfileDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.exportService.createExportProfile(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('export-profiles')
  @Roles(...PAYROLL_EXPORT_ROLES)
  @ApiOperation({ summary: 'List Finance export profiles' })
  listExportProfiles(
    @Query() query: QueryExportProfilesDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.exportService.listExportProfiles(query, session.user.id);
  }

  @Post('pay-runs/:id/export')
  @Roles(...PAYROLL_EXPORT_ROLES)
  @ApiOperation({
    summary:
      'Generate a PDF/Excel/CSV export pack for an approved pay run and mark it exported',
  })
  exportPayRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExportPayRunDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.exportService.exportPayRun(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('pay-runs/:id/exports')
  @Roles(...PAYROLL_EXPORT_ROLES)
  @ApiOperation({ summary: 'List export batches generated for a pay run' })
  listExportsForPayRun(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.exportService.listExportsForPayRun(id, session.user.id);
  }
}
