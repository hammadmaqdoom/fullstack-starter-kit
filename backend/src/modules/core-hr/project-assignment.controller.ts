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
  CreateProjectAssignmentDto,
  QueryProjectAssignmentsDto,
  UpdateProjectAssignmentDto,
} from './dto/project-assignment.dto';
import { ProjectAssignmentService } from './project-assignment.service';

@ApiTags('org')
@Controller({ path: 'org/project-assignments', version: '1' })
@UseGuards(AuthGuard)
export class ProjectAssignmentController {
  constructor(
    private readonly projectAssignmentService: ProjectAssignmentService,
  ) {}

  @Get()
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
  )
  @ApiOperation({
    summary: 'List effective-dated project assignments (scoped)',
  })
  async list(
    @Query() query: QueryProjectAssignmentsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectAssignmentService.list(query, session.user.id);
  }

  @Post()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a project assignment' })
  async create(
    @Body() dto: CreateProjectAssignmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.projectAssignmentService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Patch(':id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a project assignment' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectAssignmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.projectAssignmentService.update(
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
  @ApiOperation({ summary: 'Delete a project assignment' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    await this.projectAssignmentService.remove(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
