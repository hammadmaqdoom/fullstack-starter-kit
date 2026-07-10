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
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateStatutoryRateEntryDto,
  CreateStatutoryRateScheduleDto,
  QueryStatutoryRateSchedulesDto,
  UpdateStatutoryRateScheduleDto,
} from './dto/statutory-rate.dto';
import { StatutoryRateService } from './statutory-rate.service';

const STATUTORY_RATE_ADMIN_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('payroll')
@Controller({ path: 'payroll/statutory-rate-schedules', version: '1' })
@UseGuards(AuthGuard)
export class StatutoryRateController {
  constructor(private readonly statutoryRateService: StatutoryRateService) {}

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

  @Post()
  @Roles(...STATUTORY_RATE_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a draft statutory rate schedule' })
  create(
    @Body() dto: CreateStatutoryRateScheduleDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.statutoryRateService.createSchedule(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...STATUTORY_RATE_ADMIN_ROLES)
  @ApiOperation({ summary: 'List statutory rate schedules' })
  findAll(@Query() query: QueryStatutoryRateSchedulesDto) {
    return this.statutoryRateService.listSchedules(query);
  }

  @Get(':id')
  @Roles(...STATUTORY_RATE_ADMIN_ROLES)
  @ApiOperation({ summary: 'Get a statutory rate schedule with entries' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.statutoryRateService.getScheduleWithEntries(id);
  }

  @Get(':id/impact-preview')
  @Roles(...STATUTORY_RATE_ADMIN_ROLES)
  @ApiOperation({
    summary:
      'Preview worker count in the legal entity affected by this schedule',
  })
  impactPreview(@Param('id', ParseUUIDPipe) id: string) {
    return this.statutoryRateService.getImpactPreview(id);
  }

  @Patch(':id')
  @Roles(...STATUTORY_RATE_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a draft statutory rate schedule' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatutoryRateScheduleDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.statutoryRateService.updateSchedule(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/activate')
  @Roles(...STATUTORY_RATE_ADMIN_ROLES)
  @ApiOperation({
    summary:
      'Activate a statutory rate schedule, superseding the prior active schedule for the same legal entity + country',
  })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.statutoryRateService.activateSchedule(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/entries')
  @Roles(...STATUTORY_RATE_ADMIN_ROLES)
  @ApiOperation({ summary: 'Add a rate entry to a statutory rate schedule' })
  addEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStatutoryRateEntryDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.statutoryRateService.addEntry(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
