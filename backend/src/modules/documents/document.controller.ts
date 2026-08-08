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
import { DocumentService } from './document.service';
import {
  CreateDocumentTemplateDto,
  CreateDocumentTemplateVersionDto,
  ExportDocumentQueryDto,
  GenerateDocumentDto,
  PublishDocumentTemplateVersionDto,
  QueryDocumentRegisterDto,
  UpdateDocumentTemplateDto,
} from './dto/document.dto';
import { RenderProfile } from './enums/document.enum';

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('documents')
@Controller({ path: 'documents', version: '1' })
@UseGuards(AuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('templates')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary: 'List document templates (reuses country-config entities)',
  })
  listTemplates() {
    return this.documentService.listTemplates();
  }

  @Post('templates')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create a document template' })
  createTemplate(
    @Body() dto: CreateDocumentTemplateDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.documentService.createTemplate(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get('templates/:id')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Get document template with versions' })
  getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.getTemplate(id);
  }

  @Patch('templates/:id')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Update document template metadata / status' })
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentTemplateDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.documentService.updateTemplate(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get('templates/:id/versions')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'List versions for a document template' })
  listVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.listVersions(id);
  }

  @Post('templates/:id/versions')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create a draft document template version' })
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentTemplateVersionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.documentService.createVersion(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post('templates/:id/publish')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary: 'Publish a template version (archives prior published version)',
  })
  publishVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishDocumentTemplateVersionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.documentService.publishVersion(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post('generate')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary: 'Generate document draft from template (validates merge fields)',
  })
  generate(
    @Body() dto: GenerateDocumentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.documentService.generate(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get('register')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary:
      'Document register — paginated, filterable list of generated documents',
  })
  register(@Query() query: QueryDocumentRegisterDto) {
    return this.documentService.listRegister(query);
  }

  @Get('generated/:id')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Get a generated document' })
  getGeneratedDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.getGeneratedDocument(id);
  }

  @Post('generated/:id/issue')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary:
      'Issue a draft document — assigns immutable document_number, snapshots letterhead, stores canonical PDF (PRD §6.8.4)',
  })
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.documentService.issue(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get('generated/:id/export')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary:
      'Export an issued document at a chosen render profile (full_digital | print_on_letterhead | informational)',
  })
  exportDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ExportDocumentQueryDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.documentService.exportDocument(
      id,
      query.renderProfile ?? RenderProfile.FULL_DIGITAL,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
