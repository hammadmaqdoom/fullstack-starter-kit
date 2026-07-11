import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
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
  CreateManagerRelationshipDto,
  UpdateManagerRelationshipDto,
} from './dto/manager-relationship.dto';
import { ManagerRelationshipService } from './manager-relationship.service';

@ApiTags('org')
@Controller({ path: 'org/manager-relationships', version: '1' })
@UseGuards(AuthGuard)
export class ManagerRelationshipController {
  constructor(
    private readonly managerRelationshipService: ManagerRelationshipService,
  ) {}

  @Get()
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
  )
  @ApiOperation({
    summary: 'List effective-dated manager relationships (scoped)',
  })
  async list(
    @Query('workerId') workerId: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.managerRelationshipService.list(session.user.id, workerId);
  }

  @Post()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a manager relationship' })
  async create(
    @Body() dto: CreateManagerRelationshipDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.managerRelationshipService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Patch(':id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a manager relationship' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateManagerRelationshipDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.managerRelationshipService.update(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Delete(':id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a manager relationship' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    await this.managerRelationshipService.remove(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
