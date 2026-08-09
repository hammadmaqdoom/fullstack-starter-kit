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
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  ApproveFinanceExpenseDto,
  CreateExpenseClaimDto,
  QueryExpenseClaimsDto,
  RejectExpenseClaimDto,
  UpdateExpenseClaimDto,
  UpsertExpensePolicyDto,
} from './dto/expense.dto';
import { ExpenseClaimService } from './expense-claim.service';

const CLAIM_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const APPROVAL_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const FINANCE_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('expenses')
@Controller({ path: 'expenses', version: '1' })
@UseGuards(AuthGuard)
export class ExpenseClaimController {
  constructor(private readonly expenseClaimService: ExpenseClaimService) {}

  @Get('policies')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'List expense policies (country + category caps)' })
  async listPolicies() {
    return this.expenseClaimService.listPolicies();
  }

  @Put('policies')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({
    summary: 'Create or update an expense policy for a country/category',
  })
  async upsertPolicy(
    @Body() dto: UpsertExpensePolicyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.upsertPolicy(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get()
  @Roles(...CLAIM_ROLES)
  @ApiOperation({ summary: 'List expense claims (scoped)' })
  async list(
    @Query() query: QueryExpenseClaimsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.expenseClaimService.list(query, session.user.id);
  }

  @Get(':id')
  @Roles(...CLAIM_ROLES)
  @ApiOperation({ summary: 'Get an expense claim by id' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.expenseClaimService.findOne(id, session.user.id);
  }

  @Post()
  @Roles(...CLAIM_ROLES)
  @ApiOperation({ summary: 'Create a draft expense claim' })
  async create(
    @Body() dto: CreateExpenseClaimDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Patch(':id')
  @Roles(...CLAIM_ROLES)
  @ApiOperation({ summary: 'Update a draft expense claim' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseClaimDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.update(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/submit')
  @Roles(...CLAIM_ROLES)
  @ApiOperation({ summary: 'Submit a draft claim with policy limit check' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.submit(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/approve-manager')
  @Roles(...APPROVAL_ROLES)
  @ApiOperation({ summary: 'Manager approval (SoD: not own claim)' })
  async approveManager(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.approveManager(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/approve-finance')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({
    summary: 'Finance approval — FX conversion recorded manually',
  })
  async approveFinance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveFinanceExpenseDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.approveFinance(
      id,
      session.user.id,
      correlationId,
      request?.ip,
      undefined,
      dto,
    );
  }

  @Post(':id/mark-paid')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({
    summary: 'Mark an approved claim as paid / included in export',
  })
  async markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.markPaid(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/reject')
  @Roles(...APPROVAL_ROLES)
  @ApiOperation({ summary: 'Reject a claim with a reason' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectExpenseClaimDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.expenseClaimService.reject(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
