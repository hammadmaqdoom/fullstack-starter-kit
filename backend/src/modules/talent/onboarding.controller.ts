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
  CompleteOnboardingTaskDto,
  CreateOnboardingCaseDto,
  CreateOnboardingTemplateDto,
} from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const ONBOARDING_READ_ROLES = [
  ...PEOPLE_OPS_ROLES,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
];

@ApiTags('onboarding')
@Controller({ path: 'onboarding', version: '1' })
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

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

  @Get('templates')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'List onboarding templates (People Ops)' })
  listTemplates(@CurrentUserSession() session: CurrentUserSession) {
    return this.onboardingService.listTemplates(session.user.id);
  }

  @Post('templates')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create onboarding template (People Ops)' })
  createTemplate(
    @Body() dto: CreateOnboardingTemplateDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.onboardingService.createTemplate(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('templates/:id/publish')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Publish onboarding template' })
  publishTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.onboardingService.publishTemplate(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Get('kanban')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Onboarding cases kanban by status' })
  getKanban(@CurrentUserSession() session: CurrentUserSession) {
    return this.onboardingService.getKanban(session.user.id);
  }

  @Post('cases')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create onboarding case from published template' })
  createCase(
    @Body() dto: CreateOnboardingCaseDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.onboardingService.createCase(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('cases/:id')
  @Roles(...ONBOARDING_READ_ROLES)
  @ApiOperation({ summary: 'Get onboarding case with tasks' })
  getCase(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.onboardingService.getCase(id, session.user.id);
  }

  @Post('tasks/:id/complete')
  @Roles(...ONBOARDING_READ_ROLES)
  @ApiOperation({ summary: 'Complete an onboarding task' })
  completeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteOnboardingTaskDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.onboardingService.completeTask(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
