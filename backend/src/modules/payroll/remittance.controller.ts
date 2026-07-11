import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateRemittanceCorridorConfigDto,
  QueryRemittanceCorridorConfigsDto,
  UpdateRemittanceCorridorConfigDto,
  UploadRemittanceDocumentDto,
} from './dto/remittance.dto';
import { RemittanceService } from './remittance.service';

const REMITTANCE_ADMIN_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const PAYSLIP_READ_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
  ...REMITTANCE_ADMIN_ROLES,
];

const CONTRACTOR_INVOICE_READ_ROLES = [
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  ...REMITTANCE_ADMIN_ROLES,
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

const UPLOAD_BODY_SCHEMA = {
  schema: {
    type: 'object',
    properties: {
      documentType: { type: 'string' },
      file: { type: 'string', format: 'binary' },
    },
  },
};

@ApiTags('payroll')
@Controller({ path: 'payroll/remittance-corridors', version: '1' })
@UseGuards(AuthGuard)
export class RemittanceCorridorController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Post()
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a remittance corridor config' })
  create(
    @Body() dto: CreateRemittanceCorridorConfigDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.remittanceService.createCorridorConfig(
      dto,
      actorFrom(session, correlationId, request),
    );
  }

  @Get()
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiOperation({ summary: 'List remittance corridor configs' })
  findAll(
    @Query() query: QueryRemittanceCorridorConfigsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.remittanceService.listCorridorConfigs(
      query,
      session.user.id,
    );
  }

  @Patch(':id')
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a remittance corridor config' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRemittanceCorridorConfigDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.remittanceService.updateCorridorConfig(
      id,
      dto,
      actorFrom(session, correlationId, request),
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/pay-run-lines', version: '1' })
@UseGuards(AuthGuard)
export class PayRunLineRemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Post(':id/remittance-documents')
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @ApiBody(UPLOAD_BODY_SCHEMA)
  @ApiOperation({ summary: 'Finance upload SWIFT / bank proof for a pay run line' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10e6 } }))
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadRemittanceDocumentDto,
    @UploadedFile() file: File,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'REMITTANCE_DOCUMENT_FILE_REQUIRED',
        message: 'A file is required',
      });
    }
    return this.remittanceService.uploadForPayRunLine(
      id,
      dto,
      file,
      actorFrom(session, correlationId, request),
    );
  }

  @Get(':id/remittance-pack')
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiOperation({ summary: 'Get the remittance pack for a pay run line' })
  getPack(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.remittanceService.getPackForPayRunLine(id, session.user.id);
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/remittance-packs', version: '1' })
@UseGuards(AuthGuard)
export class RemittancePackController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Post(':id/payment-advice')
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiOperation({
    summary: 'Generate the payment advice PDF for a payroll remittance pack',
  })
  generatePaymentAdvice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.remittanceService.generatePaymentAdvice(
      id,
      actorFrom(session, correlationId, request),
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/contractor-payment-lines', version: '1' })
@UseGuards(AuthGuard)
export class ContractorPaymentLineRemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Post(':id/remittance-documents')
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiConsumes('multipart/form-data')
  @ApiBody(UPLOAD_BODY_SCHEMA)
  @ApiOperation({
    summary: 'Finance upload SWIFT / bank proof for a contractor payment line',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10e6 } }))
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadRemittanceDocumentDto,
    @UploadedFile() file: File,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'REMITTANCE_DOCUMENT_FILE_REQUIRED',
        message: 'A file is required',
      });
    }
    return this.remittanceService.uploadForContractorPaymentLine(
      id,
      dto,
      file,
      actorFrom(session, correlationId, request),
    );
  }

  @Get(':id/remittance-pack')
  @Roles(...REMITTANCE_ADMIN_ROLES)
  @ApiOperation({
    summary: 'Get the remittance pack for a contractor payment line',
  })
  getPack(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.remittanceService.getPackForContractorPaymentLine(
      id,
      session.user.id,
    );
  }
}

@ApiTags('payroll')
@Controller({ path: 'payroll/payslips', version: '1' })
@UseGuards(AuthGuard)
export class PayslipRemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Get(':id/remittance-pack')
  @Roles(...PAYSLIP_READ_ROLES)
  @ApiOperation({ summary: 'Get the remittance pack on a payslip (scoped)' })
  getPack(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.remittanceService.getPackForPayslip(id, session.user.id);
  }

  @Get(':id/remittance-pack/download')
  @Roles(...PAYSLIP_READ_ROLES)
  @ApiOperation({ summary: 'Download a ZIP of the remittance pack documents' })
  download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.remittanceService.downloadPackForPayslip(id, session.user.id);
  }
}

@ApiTags('contractor-invoices')
@Controller({ path: 'contractor-invoices', version: '1' })
@UseGuards(AuthGuard)
export class ContractorInvoiceRemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Get(':id/remittance-pack')
  @Roles(...CONTRACTOR_INVOICE_READ_ROLES)
  @ApiOperation({ summary: 'Get the remittance pack for a contractor invoice (scoped)' })
  getPack(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.remittanceService.getPackForInvoice(id, session.user.id);
  }

  @Get(':id/remittance-pack/download')
  @Roles(...CONTRACTOR_INVOICE_READ_ROLES)
  @ApiOperation({ summary: 'Download a ZIP of the remittance pack documents' })
  download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.remittanceService.downloadPackForInvoice(id, session.user.id);
  }
}
