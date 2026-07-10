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
import { CreatePayRunDto, QueryPayRunsDto } from './dto/pay-run.dto';
import { PayRunService } from './pay-run.service';

const PAY_RUN_ADMIN_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('payroll')
@Controller({ path: 'payroll/pay-runs', version: '1' })
@UseGuards(AuthGuard)
export class PayRunController {
  constructor(private readonly payRunService: PayRunService) {}

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
  @Roles(...PAY_RUN_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a draft pay run' })
  create(
    @Body() dto: CreatePayRunDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payRunService.createPayRun(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...PAY_RUN_ADMIN_ROLES)
  @ApiOperation({ summary: 'List pay runs' })
  findAll(@Query() query: QueryPayRunsDto) {
    return this.payRunService.listPayRuns(query);
  }

  @Get(':id')
  @Roles(...PAY_RUN_ADMIN_ROLES)
  @ApiOperation({ summary: 'Get a pay run with line items and anomalies' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payRunService.getPayRunDetail(id);
  }

  @Post(':id/calculate')
  @Roles(...PAY_RUN_ADMIN_ROLES)
  @ApiOperation({
    summary:
      'Calculate (or recalculate) a pay run, rebuilding line items and moving it to review',
  })
  calculate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payRunService.calculatePayRun(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/approve')
  @Roles(...PAY_RUN_ADMIN_ROLES)
  @ApiOperation({ summary: 'Approve a pay run in review status' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payRunService.approvePayRun(
      id,
      this.actor(session, correlationId, request),
    );
  }
}
