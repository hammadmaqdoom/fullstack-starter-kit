import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
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
import { QueryPayslipsDto } from './dto/payslip.dto';
import { PayslipService } from './payslip.service';

const PAYSLIP_ADMIN_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const PAYSLIP_READ_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
  ...PAYSLIP_ADMIN_ROLES,
];

@ApiTags('payroll')
@Controller({ path: 'payroll', version: '1' })
@UseGuards(AuthGuard)
export class PayslipController {
  constructor(private readonly payslipService: PayslipService) {}

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

  @Post('pay-runs/:id/release-payslips')
  @Roles(...PAYSLIP_ADMIN_ROLES)
  @ApiOperation({
    summary: 'Release payslips for an approved pay run (one per line item)',
  })
  releasePayslips(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payslipService.releasePayslips(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Get('payslips')
  @Roles(...PAYSLIP_READ_ROLES)
  @ApiOperation({
    summary:
      'List payslips (employee sees own; Finance can filter by workerId)',
  })
  listPayslips(
    @Query() query: QueryPayslipsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payslipService.listPayslips(query, session.user.id);
  }

  @Get('payslips/:id')
  @Roles(...PAYSLIP_READ_ROLES)
  @ApiOperation({ summary: 'Get a payslip (scoped to own unless Finance+)' })
  getPayslip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payslipService.getPayslip(id, session.user.id);
  }

  @Get('payslips/:id/download')
  @Roles(...PAYSLIP_READ_ROLES)
  @ApiOperation({
    summary: 'Download a released payslip PDF (blocked until released)',
  })
  downloadPayslip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payslipService.downloadPayslip(id, session.user.id);
  }
}
