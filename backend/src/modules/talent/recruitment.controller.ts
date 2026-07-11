import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
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
import {
  CreateCandidateDto,
  CreateInterviewScorecardDto,
  CreateJobRequisitionDto,
  QueryCandidatesDto,
  UpdateCandidateStatusDto,
  UpdateJobRequisitionDto,
} from './dto/recruitment.dto';
import { RecruitmentService } from './recruitment.service';

const RECRUITMENT_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('talent-recruitment')
@Controller({ path: 'talent/recruitment', version: '1' })
@UseGuards(AuthGuard)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  private actor(
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

  @Get('requisitions')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'List job requisitions (scoped)' })
  listRequisitions(@CurrentUserSession() session: CurrentUserSession) {
    return this.recruitmentService.listRequisitions(session.user.id);
  }

  @Get('requisitions/:id')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'Get a job requisition' })
  getRequisition(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruitmentService.getRequisition(id);
  }

  @Post('requisitions')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'Raise a job requisition' })
  createRequisition(
    @Body() dto: CreateJobRequisitionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.recruitmentService.createRequisition(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('requisitions/:id')
  @Roles(
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Approve, open, hold, or close a requisition' })
  updateRequisition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobRequisitionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.recruitmentService.updateRequisition(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('candidates')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'List candidates in the pipeline' })
  listCandidates(@Query() query: QueryCandidatesDto) {
    return this.recruitmentService.listCandidates(query);
  }

  @Get('candidates/:id')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'Get a candidate' })
  getCandidate(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruitmentService.getCandidate(id);
  }

  @Post('candidates')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a candidate to a requisition pipeline' })
  createCandidate(
    @Body() dto: CreateCandidateDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.recruitmentService.createCandidate(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('candidates/:id/status')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'Move a candidate through the pipeline' })
  updateCandidateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateStatusDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.recruitmentService.updateCandidateStatus(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('candidates/:id/scorecards')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'List interview scorecards for a candidate' })
  listScorecards(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruitmentService.listScorecards(id);
  }

  @Post('candidates/:id/scorecards')
  @Roles(...RECRUITMENT_ROLES)
  @ApiOperation({ summary: 'Submit a structured interview scorecard' })
  createScorecard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInterviewScorecardDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.recruitmentService.createScorecard(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
