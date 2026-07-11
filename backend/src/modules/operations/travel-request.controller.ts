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
  CreateTravelRequestDto,
  QueryTravelRequestsDto,
  ReconcileTravelRequestDto,
  RejectTravelRequestDto,
  TravelItineraryDto,
  UpdateTravelRequestDto,
  UpsertTravelApprovalRuleDto,
} from './dto/travel-request.dto';
import { TravelRequestService } from './travel-request.service';

const TRAVEL_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const APPROVAL_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const FINANCE_ROLES = [PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN];

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('travel-requests')
@Controller({ path: 'travel-requests', version: '1' })
@UseGuards(AuthGuard)
export class TravelRequestController {
  constructor(private readonly travelRequestService: TravelRequestService) {}

  @Get('approval-rules')
  @Roles(...PEOPLE_OPS_ROLES, ...FINANCE_ROLES)
  @ApiOperation({ summary: 'Get the active travel approval rule config' })
  async getApprovalRule() {
    return this.travelRequestService.getApprovalRule();
  }

  @Put('approval-rules')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Set the travel approval rule (threshold + gates)' })
  async upsertApprovalRule(
    @Body() dto: UpsertTravelApprovalRuleDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.upsertApprovalRule(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Get()
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'List travel requests (scoped)' })
  async list(
    @Query() query: QueryTravelRequestsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.travelRequestService.list(query, session.user.id);
  }

  @Get(':id')
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'Get a travel request by id' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.travelRequestService.findOne(id, session.user.id);
  }

  @Post()
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'Create a draft travel request' })
  async create(
    @Body() dto: CreateTravelRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Patch(':id')
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'Update a draft travel request' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTravelRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.update(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/itineraries')
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'Add an itinerary leg (flight/hotel/transport)' })
  async addItinerary(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TravelItineraryDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.travelRequestService.addItinerary(id, dto, session.user.id);
  }

  @Post(':id/submit')
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'Submit a draft travel request for approval' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.submit(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/approve-manager')
  @Roles(...APPROVAL_ROLES)
  @ApiOperation({ summary: 'Manager approval' })
  async approveManager(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.approveManager(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/approve-finance')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Finance approval (required above threshold)' })
  async approveFinance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.approveFinance(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/approve-people-ops')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary: 'People Ops approval (required for international travel)',
  })
  async approvePeopleOps(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.approvePeopleOps(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/reject')
  @Roles(...APPROVAL_ROLES)
  @ApiOperation({ summary: 'Reject a travel request with a reason' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTravelRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.reject(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/mark-in-progress')
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'Mark an approved trip as in progress' })
  async markInProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.travelRequestService.markInProgress(id, session.user.id);
  }

  @Post(':id/mark-completed')
  @Roles(...TRAVEL_ROLES)
  @ApiOperation({ summary: 'Mark a trip completed (§6.17.3)' })
  async markCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.travelRequestService.markCompleted(id, session.user.id);
  }

  @Post(':id/reconcile')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({
    summary: 'Finance reconciliation — estimated vs actual cost',
  })
  async reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcileTravelRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.travelRequestService.reconcile(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
