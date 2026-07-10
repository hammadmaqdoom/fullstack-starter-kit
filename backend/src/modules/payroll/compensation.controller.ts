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
import { CompensationService } from './compensation.service';
import {
  CreateCompensationDto,
  QueryCompensationDto,
  UpdateCompensationDto,
} from './dto/compensation.dto';

const COMPENSATION_ADMIN_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const COMPENSATION_READ_ROLES = [
  ...COMPENSATION_ADMIN_ROLES,
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
];

@ApiTags('payroll')
@Controller({ path: 'payroll/compensation-records', version: '1' })
@UseGuards(AuthGuard)
export class CompensationController {
  constructor(private readonly compensationService: CompensationService) {}

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
  @Roles(...COMPENSATION_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a compensation record for a worker' })
  create(
    @Body() dto: CreateCompensationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.compensationService.createCompensation(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...COMPENSATION_READ_ROLES)
  @ApiOperation({
    summary:
      'List compensation records (scoped by role; amounts redacted for non-Finance/People Ops/Super Admin)',
  })
  findAll(
    @Query() query: QueryCompensationDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.compensationService.listCompensationRecords(
      query,
      session.user.id,
    );
  }

  @Get(':id')
  @Roles(...COMPENSATION_READ_ROLES)
  @ApiOperation({
    summary:
      'Get a compensation record (amount redacted for non-Finance/People Ops/Super Admin)',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.compensationService.getCompensationRecord(
      id,
      session.user.id,
    );
  }

  @Patch(':id')
  @Roles(...COMPENSATION_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a compensation record' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompensationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.compensationService.updateCompensation(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
