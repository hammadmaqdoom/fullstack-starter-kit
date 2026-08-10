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
import { CorporateCardService } from './corporate-card.service';
import {
  AllocateCardTransactionDto,
  IssueCorporateCardDto,
} from './dto/corporate-card.dto';

const FINANCE_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.SUPER_ADMIN,
  PolarisRoleCode.PEOPLE_OPS,
];

@ApiTags('Corporate cards')
@Controller({ path: 'payroll/corporate-cards', version: '1' })
@UseGuards(AuthGuard)
export class CorporateCardController {
  constructor(private readonly corporateCardService: CorporateCardService) {}

  @Post()
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Issue a corporate card' })
  issue(
    @Body() dto: IssueCorporateCardDto,
    @CurrentUserSession('user') user: { id: string },
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    return this.corporateCardService.issueCard(dto, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: req.ip,
    });
  }

  @Get()
  @Roles(...FINANCE_ROLES)
  list(
    @Query('legalEntityId') legalEntityId: string | undefined,
    @CurrentUserSession('user') user: { id: string },
  ) {
    return this.corporateCardService.listCards(legalEntityId, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
    });
  }

  @Post('transactions/:txnId/allocate')
  @Roles(...FINANCE_ROLES)
  allocate(
    @Param('txnId', ParseUUIDPipe) txnId: string,
    @Body() dto: AllocateCardTransactionDto,
    @CurrentUserSession('user') user: { id: string },
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    return this.corporateCardService.allocateToExpense(txnId, dto, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: req.ip,
    });
  }

  @Get(':id/transactions')
  @Roles(...FINANCE_ROLES)
  listTxns(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession('user') user: { id: string },
  ) {
    return this.corporateCardService.listTransactions(id, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
    });
  }

  @Post(':id/sync-transactions')
  @Roles(...FINANCE_ROLES)
  sync(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession('user') user: { id: string },
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    return this.corporateCardService.syncCardTransactions(id, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: req.ip,
    });
  }
}
