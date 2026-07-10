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
import { BenefitService } from './benefit.service';
import {
  CreateBenefitTypeDto,
  QueryBenefitTypesDto,
  UpdateBenefitTypeDto,
} from './dto/benefit-type.dto';
import {
  CreateEmployeeBenefitDto,
  QueryEmployeeBenefitsDto,
  UpdateEmployeeBenefitDto,
} from './dto/employee-benefit.dto';

const BENEFIT_ADMIN_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const BENEFIT_READ_ROLES = [
  ...BENEFIT_ADMIN_ROLES,
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
];

@ApiTags('payroll')
@Controller({ path: 'payroll/benefit-types', version: '1' })
@UseGuards(AuthGuard)
export class BenefitTypeController {
  constructor(private readonly benefitService: BenefitService) {}

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
  @Roles(...BENEFIT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a benefit type' })
  create(
    @Body() dto: CreateBenefitTypeDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.benefitService.createBenefitType(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...BENEFIT_READ_ROLES)
  @ApiOperation({ summary: 'List benefit types (optionally by country)' })
  findAll(@Query() query: QueryBenefitTypesDto) {
    return this.benefitService.listBenefitTypes(query);
  }

  @Get(':id')
  @Roles(...BENEFIT_READ_ROLES)
  @ApiOperation({ summary: 'Get benefit type detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.benefitService.getBenefitType(id);
  }

  @Patch(':id')
  @Roles(...BENEFIT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a benefit type' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBenefitTypeDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.benefitService.updateBenefitType(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/employee-benefits', version: '1' })
@UseGuards(AuthGuard)
export class EmployeeBenefitController {
  constructor(private readonly benefitService: BenefitService) {}

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
  @Roles(...BENEFIT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Assign a benefit to a worker' })
  create(
    @Body() dto: CreateEmployeeBenefitDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.benefitService.assignEmployeeBenefit(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...BENEFIT_READ_ROLES)
  @ApiOperation({ summary: 'List employee benefit assignments (scoped)' })
  findAll(
    @Query() query: QueryEmployeeBenefitsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.benefitService.listEmployeeBenefits(query, session.user.id);
  }

  @Patch(':id')
  @Roles(...BENEFIT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update an employee benefit assignment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeBenefitDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.benefitService.updateEmployeeBenefit(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
