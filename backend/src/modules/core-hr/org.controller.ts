import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryDirectoryDto } from './dto/query-directory.dto';
import { QueryOrgChartDto } from './dto/query-org-chart.dto';
import { OrgService } from './org.service';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';

@ApiTags('org')
@Controller({ path: 'org', version: '1' })
@UseGuards(AuthGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('chart')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
  )
  @ApiOperation({ summary: 'Org chart subtree (scoped, lazy depth)' })
  async getChart(
    @Query() query: QueryOrgChartDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.orgService.getOrgChart(query, session.user.id);
  }

  @Get('directory')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
  )
  @ApiOperation({ summary: 'Searchable worker directory (scoped, redacted)' })
  async getDirectory(
    @Query() query: QueryDirectoryDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.orgService.getDirectory(query, session.user.id);
  }
}
