import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PolarisRoleCode } from './enums/polaris-role-code.enum';

/**
 * 3.3 audit-log list endpoint (enterprise-readiness.md §3.3) — People Ops /
 * Super Admin only. Compliance evidence export, not a general-purpose feed.
 */
@ApiTags('compliance')
@Controller({ path: 'audit-log', version: '1' })
@UseGuards(AuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'List audit log entries (paginated, filterable) — People Ops / Super Admin only',
  })
  async list(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.list(query);
  }
}
