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
import { BankFeedSyncService } from './bank-feed-sync.service';
import {
  MatchBankFeedDto,
  QueryBankFeedsDto,
  SyncBankFeedDto,
} from './dto/bank-feed.dto';

const FINANCE_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.SUPER_ADMIN,
  PolarisRoleCode.PEOPLE_OPS,
];

@ApiTags('Bank feeds')
@Controller({ path: 'payroll/bank-feeds', version: '1' })
@UseGuards(AuthGuard)
export class BankFeedController {
  constructor(private readonly bankFeedSyncService: BankFeedSyncService) {}

  @Post('sync')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Sync Aspire bank feed for a funding account' })
  sync(
    @Body() dto: SyncBankFeedDto,
    @CurrentUserSession('user') user: { id: string },
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    return this.bankFeedSyncService.sync(dto.fundingAccountId, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: req.ip,
    });
  }

  @Get()
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'List bank feed transactions' })
  list(
    @Query() query: QueryBankFeedsDto,
    @CurrentUserSession('user') user: { id: string },
  ) {
    return this.bankFeedSyncService.list(query, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
    });
  }

  @Post(':id/match')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Match bank feed to payout line or card txn' })
  match(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MatchBankFeedDto,
    @CurrentUserSession('user') user: { id: string },
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    return this.bankFeedSyncService.match(id, dto, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: req.ip,
    });
  }

  @Post(':id/ignore')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Ignore a bank feed transaction' })
  ignore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession('user') user: { id: string },
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    return this.bankFeedSyncService.ignore(id, {
      userId: user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: req.ip,
    });
  }
}
