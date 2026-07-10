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
import { ContractorPaymentBatchService } from './contractor-payment-batch.service';
import {
  CreateContractorPaymentBatchDto,
  MarkContractorPaymentLinePaidDto,
  QueryContractorPaymentBatchesDto,
} from './dto/contractor-payment-batch.dto';

const CONTRACTOR_PAYMENT_ADMIN_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

function actorFrom(
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

@ApiTags('payroll')
@Controller({ path: 'payroll/contractor-payment-batches', version: '1' })
@UseGuards(AuthGuard)
export class ContractorPaymentBatchController {
  constructor(
    private readonly contractorPaymentBatchService: ContractorPaymentBatchService,
  ) {}

  @Post()
  @Roles(...CONTRACTOR_PAYMENT_ADMIN_ROLES)
  @ApiOperation({
    summary:
      'Aggregate finance-approved contractor invoices into a new payment batch',
  })
  create(
    @Body() dto: CreateContractorPaymentBatchDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorPaymentBatchService.createBatch(
      dto,
      actorFrom(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...CONTRACTOR_PAYMENT_ADMIN_ROLES)
  @ApiOperation({ summary: 'List contractor payment batches' })
  findAll(
    @Query() query: QueryContractorPaymentBatchesDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.contractorPaymentBatchService.listBatches(
      query,
      session.user.id,
    );
  }

  @Get(':id')
  @Roles(...CONTRACTOR_PAYMENT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Get a contractor payment batch with its lines' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.contractorPaymentBatchService.getBatchDetail(
      id,
      session.user.id,
    );
  }

  @Post(':id/approve')
  @Roles(...CONTRACTOR_PAYMENT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Approve a contractor payment batch in review' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorPaymentBatchService.approveBatch(
      id,
      actorFrom(session, correlationId, request),
    );
  }

  @Post(':id/export')
  @Roles(...CONTRACTOR_PAYMENT_ADMIN_ROLES)
  @ApiOperation({
    summary: 'Download a CSV/xlsx payment pack for an approved batch',
  })
  export(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorPaymentBatchService.exportBatch(
      id,
      actorFrom(session, correlationId, request),
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/contractor-payment-lines', version: '1' })
@UseGuards(AuthGuard)
export class ContractorPaymentLineController {
  constructor(
    private readonly contractorPaymentBatchService: ContractorPaymentBatchService,
  ) {}

  @Post(':id/mark-paid')
  @Roles(...CONTRACTOR_PAYMENT_ADMIN_ROLES)
  @ApiOperation({
    summary: 'Mark a payment line paid and move its invoice to paid',
  })
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkContractorPaymentLinePaidDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorPaymentBatchService.markLinePaid(
      id,
      dto,
      actorFrom(session, correlationId, request),
    );
  }
}
