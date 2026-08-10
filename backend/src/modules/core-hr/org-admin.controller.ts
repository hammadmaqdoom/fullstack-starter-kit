import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { resolveTenantId } from '@/modules/compliance/tenant-context.util';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateDepartmentDto,
  CreateDivisionDto,
  CreateLegalEntityCurrencyDto,
  CreateLegalEntityDivisionMappingDto,
  CreateLegalEntityDto,
  CreateLegalEntitySignatoryDto,
  CreateOfficeLocationDto,
  UpdateDepartmentDto,
  UpdateDivisionDto,
  UpdateLegalEntityCurrencyDto,
  UpdateLegalEntityDto,
  UpdateLegalEntitySignatoryDto,
  UpdateOfficeLocationDto,
} from './dto/org-admin.dto';
import { OrgAdminService } from './org-admin.service';

const ADMIN_ROLES = [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN];

@ApiTags('org-admin')
@Controller({ path: 'org', version: '1' })
@UseGuards(AuthGuard)
export class OrgAdminController {
  constructor(private readonly orgAdminService: OrgAdminService) {}

  @Get('divisions')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List divisions' })
  listDivisions(@CurrentUserSession() session: CurrentUserSession) {
    return this.orgAdminService.listDivisions(resolveTenantId(session));
  }

  @Post('divisions')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create division' })
  createDivision(
    @Body() dto: CreateDivisionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.createDivision(
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('divisions/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update division' })
  updateDivision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDivisionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.updateDivision(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Get('departments')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List departments' })
  listDepartments(@CurrentUserSession() session: CurrentUserSession) {
    return this.orgAdminService.listDepartments(resolveTenantId(session));
  }

  @Post('departments')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create department' })
  createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.createDepartment(
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('departments/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update department' })
  updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.updateDepartment(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Get('legal-entities')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List legal entities' })
  listLegalEntities(@CurrentUserSession() session: CurrentUserSession) {
    return this.orgAdminService.listLegalEntities(resolveTenantId(session));
  }

  @Post('legal-entities')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create legal entity' })
  createLegalEntity(
    @Body() dto: CreateLegalEntityDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.createLegalEntity(
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('legal-entities/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update legal entity' })
  updateLegalEntity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalEntityDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.updateLegalEntity(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Get('legal-entities/:id/division-mappings')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List legal entity division mappings' })
  listLegalEntityMappings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.orgAdminService.listLegalEntityMappings(
      id,
      resolveTenantId(session),
    );
  }

  @Post('legal-entities/:id/division-mappings')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create legal entity division mapping' })
  createLegalEntityMapping(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLegalEntityDivisionMappingDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.createLegalEntityMapping(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Get('legal-entities/:id/currencies')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List legal entity currencies' })
  listLegalEntityCurrencies(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.orgAdminService.listLegalEntityCurrencies(
      id,
      resolveTenantId(session),
    );
  }

  @Post('legal-entities/:id/currencies')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Add legal entity currency' })
  createLegalEntityCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLegalEntityCurrencyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.createLegalEntityCurrency(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('legal-entities/:id/currencies/:currencyId')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update legal entity currency' })
  updateLegalEntityCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('currencyId', ParseUUIDPipe) currencyId: string,
    @Body() dto: UpdateLegalEntityCurrencyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.updateLegalEntityCurrency(
      id,
      currencyId,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Get('legal-entities/:id/signatories')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List legal entity signatories' })
  listLegalEntitySignatories(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.orgAdminService.listLegalEntitySignatories(
      id,
      resolveTenantId(session),
    );
  }

  @Post('legal-entities/:id/signatories')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create legal entity signatory' })
  createLegalEntitySignatory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLegalEntitySignatoryDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.createLegalEntitySignatory(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('legal-entities/:id/signatories/:signatoryId')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update legal entity signatory' })
  updateLegalEntitySignatory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('signatoryId', ParseUUIDPipe) signatoryId: string,
    @Body() dto: UpdateLegalEntitySignatoryDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.updateLegalEntitySignatory(
      id,
      signatoryId,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Get('office-locations')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List office locations' })
  listOfficeLocations(@CurrentUserSession() session: CurrentUserSession) {
    return this.orgAdminService.listOfficeLocations(resolveTenantId(session));
  }

  @Post('office-locations')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create office location' })
  createOfficeLocation(
    @Body() dto: CreateOfficeLocationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.createOfficeLocation(
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('office-locations/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update office location' })
  updateOfficeLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeLocationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.orgAdminService.updateOfficeLocation(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }
}
