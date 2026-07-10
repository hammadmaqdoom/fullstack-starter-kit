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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ContractorInvoiceService } from './contractor-invoice.service';
import {
  CreateContractorInvoiceDto,
  QueryContractorInvoicesDto,
  RejectContractorInvoiceDto,
  UpdateContractorInvoiceDto,
} from './dto/contractor-invoice.dto';

@ApiTags('contractor-invoices')
@Controller({ path: 'contractor-invoices', version: '1' })
@UseGuards(AuthGuard)
export class ContractorInvoiceController {
  constructor(
    private readonly contractorInvoiceService: ContractorInvoiceService,
  ) {}

  @Get()
  @Roles(
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List contractor invoices (scoped)' })
  async list(
    @Query() query: QueryContractorInvoicesDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.contractorInvoiceService.list(query, session.user.id);
  }

  @Get(':id')
  @Roles(
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get a contractor invoice by id' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.contractorInvoiceService.findOne(id, session.user.id);
  }

  @Post()
  @Roles(
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Create a draft contractor invoice' })
  async create(
    @Body() dto: CreateContractorInvoiceDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorInvoiceService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Patch(':id')
  @Roles(
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Update a draft contractor invoice' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractorInvoiceDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorInvoiceService.update(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/submit')
  @Roles(
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Submit a draft invoice for manager approval' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorInvoiceService.submit(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/approve-manager')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Manager approval — work delivered confirmed' })
  async approveManager(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorInvoiceService.approveManager(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/approve-finance')
  @Roles(
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Finance approval — amount, tax and budget confirmed',
  })
  async approveFinance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorInvoiceService.approveFinance(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/reject')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Reject an invoice with a reason' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectContractorInvoiceDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.contractorInvoiceService.reject(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
