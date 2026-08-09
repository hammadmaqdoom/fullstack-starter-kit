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
  CreateDevelopmentActionDto,
  CreateDevelopmentPlanDto,
  CreateFeedbackDto,
  CreateGoalCheckInDto,
  CreateGoalDto,
  CreateKeyResultDto,
  CreateObjectiveDto,
  CreateOneOnOneDto,
  CreateOneOnOneNoteDto,
  CreatePerformanceCycleDto,
  CreatePulseSurveyDto,
  CreateRecognitionDto,
  DisputeReviewDto,
  FinalizeCalibrationDto,
  ResolveDisputeDto,
  SubmitManagerReviewDto,
  TriggerProbationSeparationDto,
  SubmitPeerFeedbackDto,
  SubmitPulseResponseDto,
  SubmitSelfAssessmentDto,
  UpdateDevelopmentActionDto,
  UpdateDevelopmentPlanDto,
  UpdateGoalDto,
  UpdateKeyResultDto,
  UpdateObjectiveDto,
  UpdateOneOnOneDto,
  UpdatePerformanceCycleDto,
  UpdatePulseSurveyDto,
} from './dto/talent.dto';
import { TalentService } from './talent.service';

const TALENT_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('talent')
@Controller({ path: 'talent', version: '1' })
@UseGuards(AuthGuard)
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

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

  @Get('performance/dashboard')
  @Roles(...TALENT_ROLES)
  @ApiOperation({ summary: 'Performance management dashboard' })
  getDashboard(@CurrentUserSession() session: CurrentUserSession) {
    return this.talentService.getPerformanceDashboard(session.user.id);
  }

  @Get('performance/team-dashboard')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.HRBP,
  )
  @ApiOperation({ summary: 'Manager / division team performance dashboard' })
  getTeamDashboard(@CurrentUserSession() session: CurrentUserSession) {
    return this.talentService.getTeamPerformanceDashboard(session.user.id);
  }

  @Get('objectives')
  @Roles(...TALENT_ROLES)
  listObjectives(@CurrentUserSession() session: CurrentUserSession) {
    return this.talentService.listObjectives(session.user.id);
  }

  @Post('objectives')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.SUPER_ADMIN,
  )
  createObjective(
    @Body() dto: CreateObjectiveDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createObjective(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('objectives/:id')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.SUPER_ADMIN,
  )
  updateObjective(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateObjectiveDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updateObjective(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('objectives/:objectiveId/key-results')
  @Roles(...TALENT_ROLES)
  listKeyResults(
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listKeyResults(objectiveId, session.user.id);
  }

  @Post('objectives/:objectiveId/key-results')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.SUPER_ADMIN,
  )
  createKeyResult(
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Body() dto: CreateKeyResultDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createKeyResult(
      objectiveId,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('key-results/:id')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.SUPER_ADMIN,
  )
  updateKeyResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKeyResultDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updateKeyResult(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('goals')
  @Roles(...TALENT_ROLES)
  listGoals(
    @Query('workerId') workerId: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listGoals(session.user.id, workerId);
  }

  @Post('goals')
  @Roles(...TALENT_ROLES)
  createGoal(
    @Body() dto: CreateGoalDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createGoal(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('goals/:id')
  @Roles(...TALENT_ROLES)
  updateGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updateGoal(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('goals/:goalId/check-ins')
  @Roles(...TALENT_ROLES)
  listGoalCheckIns(
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listGoalCheckIns(goalId, session.user.id);
  }

  @Post('goals/:goalId/check-ins')
  @Roles(...TALENT_ROLES)
  addGoalCheckIn(
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Body() dto: CreateGoalCheckInDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.addGoalCheckIn(
      goalId,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('feedback')
  @Roles(...TALENT_ROLES)
  listFeedback(
    @Query('workerId') workerId: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listFeedback(session.user.id, workerId);
  }

  @Post('feedback')
  @Roles(...TALENT_ROLES)
  createFeedback(
    @Body() dto: CreateFeedbackDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createFeedback(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('recognition')
  @Roles(...TALENT_ROLES)
  listRecognition(@CurrentUserSession() session: CurrentUserSession) {
    return this.talentService.listRecognition(session.user.id);
  }

  @Post('recognition')
  @Roles(...TALENT_ROLES)
  createRecognition(
    @Body() dto: CreateRecognitionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createRecognition(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('one-on-ones')
  @Roles(...TALENT_ROLES)
  listOneOnOnes(@CurrentUserSession() session: CurrentUserSession) {
    return this.talentService.listOneOnOnes(session.user.id);
  }

  @Post('one-on-ones')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  createOneOnOne(
    @Body() dto: CreateOneOnOneDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createOneOnOne(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('one-on-ones/:id')
  @Roles(...TALENT_ROLES)
  updateOneOnOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOneOnOneDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updateOneOnOne(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('one-on-ones/:id/notes')
  @Roles(...TALENT_ROLES)
  addOneOnOneNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOneOnOneNoteDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.addOneOnOneNote(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('performance-cycles')
  @Roles(...TALENT_ROLES)
  listCycles(@CurrentUserSession() session: CurrentUserSession) {
    return this.talentService.listCycles(session.user.id);
  }

  @Post('performance-cycles')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  createCycle(
    @Body() dto: CreatePerformanceCycleDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createCycle(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('performance-cycles/:id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  updateCycle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePerformanceCycleDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updateCycle(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('reviews')
  @Roles(...TALENT_ROLES)
  listReviews(
    @Query('cycleId') cycleId: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listReviews(session.user.id, cycleId);
  }

  @Get('reviews/:id')
  @Roles(...TALENT_ROLES)
  getReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.getReview(id, session.user.id);
  }

  @Post('reviews/:id/self-assessment')
  @Roles(...TALENT_ROLES)
  submitSelfAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitSelfAssessmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.submitSelfAssessment(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('reviews/:id/manager-review')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  submitManagerReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitManagerReviewDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.submitManagerReview(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('reviews/:id/peer-feedback')
  @Roles(...TALENT_ROLES)
  submitPeerFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitPeerFeedbackDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.submitPeerFeedback(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('reviews/:id/sign-off')
  @Roles(...TALENT_ROLES)
  signOffReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('asManager') asManager: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.signOffReview(
      id,
      this.actor(session, correlationId, request),
      asManager === 'true',
    );
  }

  @Post('reviews/:id/dispute')
  @Roles(...TALENT_ROLES)
  disputeReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisputeReviewDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.disputeReview(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('reviews/:id/resolve-dispute')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  resolveDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.resolveDispute(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('reviews/:id/trigger-separation')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  triggerSeparationFromProbation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TriggerProbationSeparationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.triggerSeparationFromProbationReview(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('performance-cycles/:cycleId/calibration-board')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.SUPER_ADMIN,
  )
  getCalibrationBoard(
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listCalibrationBoard(cycleId, session.user.id);
  }

  @Post('reviews/:id/calibration')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.SUPER_ADMIN,
  )
  finalizeCalibration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeCalibrationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.finalizeCalibration(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('development-plans')
  @Roles(...TALENT_ROLES)
  listDevelopmentPlans(
    @Query('workerId') workerId: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listDevelopmentPlans(session.user.id, workerId);
  }

  @Post('development-plans')
  @Roles(...TALENT_ROLES)
  createDevelopmentPlan(
    @Body() dto: CreateDevelopmentPlanDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createDevelopmentPlan(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('development-plans/:id')
  @Roles(...TALENT_ROLES)
  updateDevelopmentPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDevelopmentPlanDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updateDevelopmentPlan(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('development-plans/:planId/actions')
  @Roles(...TALENT_ROLES)
  listDevelopmentActions(
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.listDevelopmentActions(planId, session.user.id);
  }

  @Post('development-plans/:planId/actions')
  @Roles(...TALENT_ROLES)
  addDevelopmentAction(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateDevelopmentActionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.addDevelopmentAction(
      planId,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('development-actions/:id')
  @Roles(...TALENT_ROLES)
  updateDevelopmentAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDevelopmentActionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updateDevelopmentAction(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('pulse-surveys')
  @Roles(...TALENT_ROLES)
  listPulseSurveys(@CurrentUserSession() session: CurrentUserSession) {
    return this.talentService.listPulseSurveys(session.user.id);
  }

  @Post('pulse-surveys')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  createPulseSurvey(
    @Body() dto: CreatePulseSurveyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.createPulseSurvey(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('pulse-surveys/:id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  updatePulseSurvey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePulseSurveyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.updatePulseSurvey(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('pulse-surveys/:id/responses')
  @Roles(...TALENT_ROLES)
  submitPulseResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitPulseResponseDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.talentService.submitPulseResponse(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('pulse-surveys/:id/results')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.SUPER_ADMIN,
  )
  getPulseResults(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.talentService.getPulseResults(id, session.user.id);
  }
}
