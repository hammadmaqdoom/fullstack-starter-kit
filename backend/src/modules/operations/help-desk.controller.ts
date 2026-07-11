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
  AssignTicketDto,
  CreateHelpDeskTicketDto,
  CreateTicketCommentDto,
  QueryHelpDeskTicketsDto,
  ResolveTicketDto,
  UpdateHelpDeskTicketDto,
  UpsertHelpDeskSlaPolicyDto,
} from './dto/help-desk.dto';
import { HelpDeskService } from './help-desk.service';

const ALL_STAFF_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.IT_ADMIN,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const QUEUE_STAFF_ROLES = [
  PolarisRoleCode.IT_ADMIN,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('help-desk')
@Controller({ path: 'help-desk', version: '1' })
@UseGuards(AuthGuard)
export class HelpDeskController {
  constructor(private readonly helpDeskService: HelpDeskService) {}

  @Get('sla-policies')
  @Roles(...QUEUE_STAFF_ROLES)
  @ApiOperation({ summary: 'List SLA target hours by queue + priority' })
  async listSlaPolicies() {
    return this.helpDeskService.listSlaPolicies();
  }

  @Put('sla-policies')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create or update an SLA policy' })
  async upsertSlaPolicy(
    @Body() dto: UpsertHelpDeskSlaPolicyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.helpDeskService.upsertSlaPolicy(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get('tickets')
  @Roles(...ALL_STAFF_ROLES)
  @ApiOperation({
    summary: 'List help desk tickets (scoped by queue/requester)',
  })
  async list(
    @Query() query: QueryHelpDeskTicketsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.helpDeskService.list(query, session.user.id);
  }

  @Get('tickets/:id')
  @Roles(...ALL_STAFF_ROLES)
  @ApiOperation({ summary: 'Get a help desk ticket by id' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.helpDeskService.findOne(id, session.user.id);
  }

  @Post('tickets')
  @Roles(...ALL_STAFF_ROLES)
  @ApiOperation({ summary: 'Raise a help desk ticket (auto-routed to queue)' })
  async create(
    @Body() dto: CreateHelpDeskTicketDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.helpDeskService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Patch('tickets/:id')
  @Roles(...ALL_STAFF_ROLES)
  @ApiOperation({ summary: 'Update ticket priority/attachments' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHelpDeskTicketDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.helpDeskService.update(id, dto, session.user.id);
  }

  @Post('tickets/:id/assign')
  @Roles(...QUEUE_STAFF_ROLES)
  @ApiOperation({ summary: 'Pick up / assign a ticket — starts the SLA clock' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.helpDeskService.assign(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post('tickets/:id/request-info')
  @Roles(...QUEUE_STAFF_ROLES)
  @ApiOperation({ summary: 'Request more info from the employee' })
  async requestInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.helpDeskService.requestInfo(id, session.user.id);
  }

  @Post('tickets/:id/comments')
  @Roles(...ALL_STAFF_ROLES)
  @ApiOperation({ summary: 'Add a comment (internal notes staff-only)' })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.helpDeskService.addComment(id, dto, session.user.id);
  }

  @Post('tickets/:id/resolve')
  @Roles(...QUEUE_STAFF_ROLES)
  @ApiOperation({ summary: 'Resolve with mandatory resolution notes' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveTicketDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.helpDeskService.resolve(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post('tickets/:id/close')
  @Roles(...ALL_STAFF_ROLES)
  @ApiOperation({ summary: 'Confirm close (employee) or staff close' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.helpDeskService.close(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
