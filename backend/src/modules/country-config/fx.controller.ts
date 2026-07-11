import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  OverrideExchangeRateDto,
  UpsertFxVarianceAlertConfigDto,
} from './dto/fx.dto';
import { RateStatus } from './enums/country-config.enum';
import { FxService } from './fx.service';

@ApiTags('config')
@Controller({ path: 'config/fx', version: '1' })
@UseGuards(AuthGuard)
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('currencies')
  @ApiOperation({ summary: 'List currencies' })
  async listCurrencies() {
    return this.fxService.listCurrencies();
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'List exchange rates' })
  async listExchangeRates(
    @Query('fromCurrency') fromCurrency?: string,
    @Query('toCurrency') toCurrency?: string,
    @Query('status') status?: RateStatus,
  ) {
    return this.fxService.listExchangeRates({ fromCurrency, toCurrency, status });
  }

  @Get('fetch-status')
  @ApiOperation({ summary: 'Latest FX fetch batch status' })
  async getFetchStatus() {
    return this.fxService.getFetchStatus();
  }

  @Post('exchange-rates/override')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit a manual exchange rate override (pending approval)' })
  async overrideRate(
    @Body() dto: OverrideExchangeRateDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.fxService.overrideRate(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post('exchange-rates/:id/approve')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve a pending manual override rate' })
  async approveRate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.fxService.approveRate(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get('variance-alerts')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'List FX variance alert threshold configs' })
  async listVarianceAlertConfigs() {
    return this.fxService.listVarianceAlertConfigs();
  }

  @Put('variance-alerts')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create or update an FX variance alert threshold' })
  async upsertVarianceAlertConfig(
    @Body() dto: UpsertFxVarianceAlertConfigDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.fxService.upsertVarianceAlertConfig(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
