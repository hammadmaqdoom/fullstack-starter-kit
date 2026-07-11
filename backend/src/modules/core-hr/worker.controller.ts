import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { POLARIS_AUTH_CONTEXT_KEY } from '@/constants/rbac.constant';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
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
import { CreateWorkerDto } from './dto/create-worker.dto';
import { SubmitProfileChangeRequestDto } from './dto/profile-change-request.dto';
import { QueryWorkersDto } from './dto/query-workers.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { ProfileChangeRequestService } from './profile-change-request.service';
import { WorkerService } from './worker.service';

type WorkerRequest = FastifyRequest & {
  [POLARIS_AUTH_CONTEXT_KEY]?: PolarisAuthContext;
};

@ApiTags('workers')
@Controller({ path: 'workers', version: '1' })
@UseGuards(AuthGuard)
export class WorkerController {
  constructor(
    private readonly workerService: WorkerService,
    private readonly profileChangeRequestService: ProfileChangeRequestService,
  ) {}

  @Post()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a worker profile' })
  async create(
    @Body() dto: CreateWorkerDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: WorkerRequest,
  ) {
    return this.workerService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get()
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.FINANCE,
  )
  @ApiOperation({ summary: 'List workers (scoped)' })
  async findAll(
    @Query() query: QueryWorkersDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.workerService.findAll(query, session.user.id);
  }

  @Post(':id/change-requests')
  @Roles(
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Submit profile change request' })
  async submitChangeRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitProfileChangeRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: WorkerRequest,
  ) {
    return this.profileChangeRequestService.submit(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get(':id/change-requests')
  @Roles(
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
  )
  @ApiOperation({ summary: 'List profile change requests for worker' })
  async listChangeRequests(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.profileChangeRequestService.listByWorker(id, session.user.id);
  }

  @Get('me')
  @Roles(
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get worker profile linked to current session' })
  async findMe(@CurrentUserSession() session: CurrentUserSession) {
    return this.workerService.findMe(session.user.id);
  }

  @Get(':id')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.EMPLOYEE,
    PolarisRoleCode.CONTRACTOR,
  )
  @ApiOperation({ summary: 'Get worker profile (scoped)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.workerService.findOne(id, session.user.id);
  }

  @Patch(':id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update worker profile' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: WorkerRequest,
  ) {
    return this.workerService.update(
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
  @ApiOperation({ summary: 'Archive worker (soft delete)' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: WorkerRequest,
  ) {
    await this.workerService.archive(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
