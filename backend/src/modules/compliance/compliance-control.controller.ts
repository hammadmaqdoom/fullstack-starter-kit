import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ComplianceControlService } from './compliance-control.service';
import { ComplianceEvidenceService } from './compliance-evidence.service';
import {
  CreateControlEvidenceLinkDto,
  QueryControlsDto,
  UpdateComplianceProgrammeDto,
} from './dto/compliance-control.dto';
import { PolarisRoleCode } from './enums/polaris-role-code.enum';
import { resolveTenantId } from './tenant-context.util';

@ApiTags('compliance-controls')
@Controller({ path: 'compliance', version: '1' })
@UseGuards(AuthGuard)
export class ComplianceControlController {
  constructor(
    private readonly controlService: ComplianceControlService,
    private readonly evidenceService: ComplianceEvidenceService,
  ) {}

  @Get('programme')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get compliance programme settings for tenant' })
  async getProgramme(@CurrentUserSession() session: CurrentUserSession) {
    return this.controlService.getProgramme(resolveTenantId(session));
  }

  @Patch('programme')
  @Roles(PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update compliance programme (evidence window)' })
  async updateProgramme(
    @Body() dto: UpdateComplianceProgrammeDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.controlService.updateProgramme(
      resolveTenantId(session),
      dto,
      session.user.id,
    );
  }

  @Get('controls')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List compliance controls with latest run' })
  async listControls(
    @Query() query: QueryControlsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.controlService.listControls(resolveTenantId(session), query);
  }

  @Get('controls/:code')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Control detail with maps and recent runs' })
  async getControl(
    @Param('code') code: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.controlService.getControl(resolveTenantId(session), code);
  }

  @Get('controls/:code/runs')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  async listRuns(
    @Param('code') code: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.controlService.listRuns(resolveTenantId(session), code);
  }

  @Post('controls/run')
  @Roles(PolarisRoleCode.IT_ADMIN, PolarisRoleCode.SUPER_ADMIN)
  async runAll(@CurrentUserSession() session: CurrentUserSession) {
    return this.controlService.runAll(
      resolveTenantId(session),
      session.user.id,
    );
  }

  @Post('controls/:code/run')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  async runControl(
    @Param('code') code: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.controlService.runControl(
      resolveTenantId(session),
      code,
      session.user.id,
    );
  }

  @Post('controls/:code/evidence-links')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  async addEvidenceLink(
    @Param('code') code: string,
    @Body() dto: CreateControlEvidenceLinkDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.controlService.addEvidenceLink(
      resolveTenantId(session),
      code,
      dto,
      session.user.id,
    );
  }

  @Get('evidence/status')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'GRC sync contract — control evidence status' })
  async evidenceStatus(@CurrentUserSession() session: CurrentUserSession) {
    return this.evidenceService.status(resolveTenantId(session));
  }

  @Get('evidence/export')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Auditor evidence JSON pack' })
  @Header('Content-Type', 'application/json')
  async evidenceExport(
    @Query('framework') framework: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const tenantId = resolveTenantId(session);
    const pack = await this.evidenceService.exportPack(tenantId, framework);
    const date = new Date().toISOString().slice(0, 10);
    const fw = framework ?? 'all';
    res.header(
      'Content-Disposition',
      `attachment; filename="polaris-evidence-${tenantId}-${fw}-${date}.json"`,
    );
    return pack;
  }
}
