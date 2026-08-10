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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ConfirmManualPaidDto,
  CreatePayoutBatchDto,
  PreviewPayoutBatchDto,
} from './dto/payout-batch.dto';
import { PayoutOrchestratorService } from './payout-orchestrator.service';

@ApiTags('payroll')
@Controller({ path: 'payroll/payout-batches', version: '1' })
@UseGuards(AuthGuard)
export class PayoutBatchController {
  constructor(
    private readonly payoutOrchestratorService: PayoutOrchestratorService,
  ) {}

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

  @Post('preview')
  @Roles(
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
  )
  @ApiOperation({ summary: 'Preview payout batch lines and rail resolution' })
  preview(
    @Body() dto: PreviewPayoutBatchDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payoutOrchestratorService.preview(dto, this.actor(session));
  }

  @Post()
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a draft payout batch' })
  create(
    @Body() dto: CreatePayoutBatchDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payoutOrchestratorService.createDraft(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get(':id')
  @Roles(
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
  )
  @ApiOperation({ summary: 'Get payout batch detail' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payoutOrchestratorService.getBatch(id, DIGITARO_TENANT_ID);
  }

  @Post(':id/execute-manual')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate manual bank CSV and mark batch submitted' })
  async executeManual(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const result = await this.payoutOrchestratorService.executeManual(
      id,
      this.actor(session, correlationId, request),
    );
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="${result.fileName}"`,
      )
      .send(result.csv);
  }

  @Post(':id/execute-provider')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit batch to Aspire or Wise' })
  executeProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payoutOrchestratorService.executeProvider(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/retry-with-secondary')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retry a failed Aspire batch on Wise' })
  retryWithSecondary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payoutOrchestratorService.retryWithSecondary(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/confirm-manual-paid')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Confirm manual bank payments with references' })
  confirmManualPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmManualPaidDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.payoutOrchestratorService.confirmManualPaid(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
