import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
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
}
