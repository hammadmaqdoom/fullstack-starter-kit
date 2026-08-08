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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { UpdateLegalEntityDocumentOutputDto } from './dto/letterhead-config.dto';
import { LetterheadConfigService } from './letterhead-config.service';

const ADMIN_ROLES = [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN];

@ApiTags('legal-entities')
@Controller({ path: 'legal-entities', version: '1' })
@UseGuards(AuthGuard)
@Roles(...ADMIN_ROLES)
export class LegalEntityDocumentOutputController {
  constructor(
    private readonly letterheadConfigService: LetterheadConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List legal entities with their stamp config and default render profile',
  })
  list() {
    return this.letterheadConfigService.listLegalEntities();
  }

  @Patch(':id/document-output')
  @ApiOperation({
    summary:
      'Update stamp config and default render profile for a legal entity (PRD §6.8.1)',
  })
  updateDocumentOutput(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalEntityDocumentOutputDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.letterheadConfigService.updateDocumentOutput(id, dto, {
      actorId: session.user.id,
      correlationId,
      ipAddress: request?.ip,
    });
  }
}
