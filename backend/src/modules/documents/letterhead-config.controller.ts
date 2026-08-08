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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CreateLetterheadConfigDto } from './dto/letterhead-config.dto';
import { LetterheadConfigService } from './letterhead-config.service';

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('letterhead-configs')
@Controller({ path: 'letterhead-configs', version: '1' })
@UseGuards(AuthGuard)
@Roles(...PEOPLE_OPS_ROLES)
export class LetterheadConfigController {
  constructor(
    private readonly letterheadConfigService: LetterheadConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List letterhead config versions (optionally scoped to a legal entity)',
  })
  list(@Query('legalEntityId') legalEntityId?: string) {
    return this.letterheadConfigService.list(legalEntityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a letterhead config version' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.letterheadConfigService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a new letterhead version for a legal entity (promotes to current; prior issued PDFs keep their snapshot)',
  })
  create(
    @Body() dto: CreateLetterheadConfigDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.letterheadConfigService.create(dto, {
      actorId: session.user.id,
      correlationId,
      ipAddress: request?.ip,
    });
  }
}
