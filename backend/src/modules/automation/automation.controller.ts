import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlertRuleService } from './alert-rule.service';
import { AutomationService } from './automation.service';
import {
  CreateAlertRuleDto,
  CreateScheduledReportDto,
  UpdateAlertRuleDto,
  UpdateNotificationPreferencesDto,
} from './dto/automation.dto';

const PEOPLE_OPS_ADMIN_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('automation')
@Controller({ path: '', version: '1' })
@UseGuards(AuthGuard)
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly alertRuleService: AlertRuleService,
  ) {}

  @Get('notifications/preferences')
  @Roles(
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.DIVISION_HEAD,
  )
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  async getPreferences(@CurrentUserSession() session: CurrentUserSession) {
    return this.automationService.getNotificationPreferences(session.user.id);
  }

  @Patch('notifications/preferences')
  @Roles(
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.DIVISION_HEAD,
  )
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.automationService.updateNotificationPreferences(
      session.user.id,
      dto,
      session.user.id,
    );
  }

  @Get('reports/subscriptions')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.DIVISION_HEAD,
  )
  @ApiOperation({ summary: 'List scheduled report subscriptions' })
  async listSubscriptions(@CurrentUserSession() session: CurrentUserSession) {
    return this.automationService.listScheduledReports(session.user.id);
  }

  @Post('reports/subscriptions')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.DIVISION_HEAD,
  )
  @ApiOperation({ summary: 'Create scheduled report subscription' })
  async createSubscription(
    @Body() dto: CreateScheduledReportDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.automationService.createScheduledReport(
      session.user.id,
      dto,
      session.user.id,
    );
  }

  @Get('reports/:reportType/run')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.DIVISION_HEAD,
  )
  @ApiOperation({ summary: 'Run a standard report (async delivery later)' })
  async runReport(@Param('reportType') reportType: string) {
    return this.automationService.runReport(reportType);
  }

  @Get('alerts/compliance')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
  )
  @ApiOperation({ summary: 'List compliance alerts (visa, probation, etc.)' })
  async listAlerts() {
    return this.automationService.listComplianceAlerts();
  }

  @Get('alert-rules')
  @Roles(...PEOPLE_OPS_ADMIN_ROLES)
  @ApiOperation({ summary: 'List custom compliance alert rules' })
  async listAlertRules() {
    return this.alertRuleService.list();
  }

  @Post('alert-rules')
  @Roles(...PEOPLE_OPS_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a custom compliance alert rule' })
  async createAlertRule(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.alertRuleService.create(dto, session.user.id);
  }

  @Patch('alert-rules/:id')
  @Roles(...PEOPLE_OPS_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a custom compliance alert rule' })
  async updateAlertRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.alertRuleService.update(id, dto, session.user.id);
  }

  @Delete('alert-rules/:id')
  @Roles(...PEOPLE_OPS_ADMIN_ROLES)
  @ApiOperation({ summary: 'Delete a custom compliance alert rule' })
  async deleteAlertRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    await this.alertRuleService.remove(id, session.user.id);
    return { data: { id }, meta: {}, errors: [] };
  }
}
