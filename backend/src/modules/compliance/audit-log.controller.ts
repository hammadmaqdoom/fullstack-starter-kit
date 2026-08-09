import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PolarisRoleCode } from './enums/polaris-role-code.enum';
import { resolveTenantId } from './tenant-context.util';

/**
 * 3.3 audit-log list endpoint (enterprise-readiness.md §3.3) — People Ops /
 * Super Admin only. Compliance evidence export, not a general-purpose feed.
 */
@ApiTags('compliance')
@Controller({ path: 'audit-log', version: '1' })
@UseGuards(AuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('export')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export audit log as CSV (tenant-scoped, newest first)',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @Query() query: QueryAuditLogDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const tenantId = resolveTenantId(session);
    const csv = await this.auditLogService.exportCsv(query, tenantId);
    const date = new Date().toISOString().slice(0, 10);
    res.header(
      'Content-Disposition',
      `attachment; filename="polaris-audit-log-${date}.csv"`,
    );
    return csv;
  }

  @Get()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'List audit log entries (paginated, filterable) — People Ops / Super Admin only',
  })
  async list(
    @Query() query: QueryAuditLogDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.auditLogService.list(query, resolveTenantId(session));
  }
}
