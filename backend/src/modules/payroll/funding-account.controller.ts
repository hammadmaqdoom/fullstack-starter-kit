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
import {
  CreateFundingAccountDto,
  QueryFundingAccountsDto,
  UpdateFundingAccountDto,
} from './dto/funding-account.dto';
import {
  CreateCsvExportProfileDto,
  UpdateCsvExportProfileDto,
  UpdatePayoutRailProfileDto,
  UpsertCorridorOverrideDto,
} from './dto/payout-rail.dto';
import { FundingAccountService } from './funding-account.service';
import {
  CsvExportProfileService,
  PayoutRailProfileService,
} from './payout-rail-profile.service';

const FINANCE_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.SUPER_ADMIN,
  PolarisRoleCode.PEOPLE_OPS,
];

@ApiTags('payroll')
@Controller({ path: 'payroll/funding-accounts', version: '1' })
@UseGuards(AuthGuard)
export class FundingAccountController {
  constructor(private readonly fundingAccountService: FundingAccountService) {}

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
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a funding account' })
  create(
    @Body() dto: CreateFundingAccountDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.fundingAccountService.create(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'List funding accounts' })
  list(
    @Query() query: QueryFundingAccountsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.fundingAccountService.list(
      query,
      this.actor(session),
    );
  }

  @Get(':id')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Get funding account' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.fundingAccountService.get(id, this.actor(session));
  }

  @Patch(':id')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update funding account' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFundingAccountDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.fundingAccountService.update(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/payout-rail-profiles', version: '1' })
@UseGuards(AuthGuard)
export class PayoutRailProfileController {
  constructor(
    private readonly payoutRailProfileService: PayoutRailProfileService,
  ) {}

  private actor(session: CurrentUserSession) {
    return { userId: session.user.id, tenantId: DIGITARO_TENANT_ID };
  }

  @Get(':legalEntityId')
  @Roles(...FINANCE_ROLES)
  get(
    @Param('legalEntityId', ParseUUIDPipe) legalEntityId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payoutRailProfileService.getProfile(
      legalEntityId,
      this.actor(session),
    );
  }

  @Patch(':legalEntityId')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  update(
    @Param('legalEntityId', ParseUUIDPipe) legalEntityId: string,
    @Body() dto: UpdatePayoutRailProfileDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payoutRailProfileService.updateProfile(
      legalEntityId,
      dto,
      this.actor(session),
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/payout-corridor-overrides', version: '1' })
@UseGuards(AuthGuard)
export class PayoutCorridorController {
  constructor(
    private readonly payoutRailProfileService: PayoutRailProfileService,
  ) {}

  private actor(session: CurrentUserSession) {
    return { userId: session.user.id, tenantId: DIGITARO_TENANT_ID };
  }

  @Get()
  @Roles(...FINANCE_ROLES)
  list(@CurrentUserSession() session: CurrentUserSession) {
    return this.payoutRailProfileService.listCorridors(this.actor(session));
  }

  @Post()
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  upsert(
    @Body() dto: UpsertCorridorOverrideDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.payoutRailProfileService.upsertCorridor(
      dto,
      this.actor(session),
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/csv-export-profiles', version: '1' })
@UseGuards(AuthGuard)
export class CsvExportProfileController {
  constructor(
    private readonly csvExportProfileService: CsvExportProfileService,
  ) {}

  private actor(session: CurrentUserSession) {
    return { userId: session.user.id, tenantId: DIGITARO_TENANT_ID };
  }

  @Post()
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  create(
    @Body() dto: CreateCsvExportProfileDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.csvExportProfileService.create(dto, this.actor(session));
  }

  @Get()
  @Roles(...FINANCE_ROLES)
  list(
    @Query('legalEntityId') legalEntityId: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.csvExportProfileService.list(
      legalEntityId,
      this.actor(session),
    );
  }

  @Patch(':id')
  @Roles(PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCsvExportProfileDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.csvExportProfileService.update(id, dto, this.actor(session));
  }
}
