import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeadershipAnalyticsService } from './leadership-analytics.service';

@ApiTags('analytics')
@Controller({ path: 'analytics/leadership', version: '1' })
@UseGuards(AuthGuard)
@Roles(
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.SUPER_ADMIN,
)
export class LeadershipAnalyticsController {
  constructor(
    private readonly leadershipAnalyticsService: LeadershipAnalyticsService,
  ) {}

  @Get('headcount')
  @ApiOperation({ summary: 'Active headcount by legal entity, division and location' })
  async headcount() {
    return this.leadershipAnalyticsService.headcountByEntity();
  }

  @Get('attrition')
  @ApiOperation({ summary: 'Trailing 12-month attrition trend by legal entity' })
  async attrition() {
    return this.leadershipAnalyticsService.attritionByEntity();
  }

  @Get('leave-liability')
  @ApiOperation({ summary: 'Outstanding leave liability by legal entity, division and location' })
  async leaveLiability(
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.leadershipAnalyticsService.leaveLiabilityByEntity(
      undefined,
      year,
    );
  }

  @Get('visa-pipeline')
  @ApiOperation({ summary: 'Upcoming visa/work-pass expiries by legal entity, division and location' })
  async visaPipeline() {
    return this.leadershipAnalyticsService.visaPipelineByEntity();
  }
}
