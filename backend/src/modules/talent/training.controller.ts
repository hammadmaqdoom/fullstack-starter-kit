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
  AssignTrainingDto,
  CompleteTrainingAssignmentDto,
  CreateTrainingCourseDto,
  QueryTrainingAssignmentsDto,
  UpdateTrainingAssignmentDto,
  UpdateTrainingCourseDto,
} from './dto/training.dto';
import { TrainingService } from './training.service';

const TRAINING_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('talent-training')
@Controller({ path: 'talent/training', version: '1' })
@UseGuards(AuthGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

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

  @Get('courses')
  @Roles(...TRAINING_ROLES)
  @ApiOperation({ summary: 'List active training courses' })
  listCourses() {
    return this.trainingService.listCourses();
  }

  @Post('courses')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Publish a training course' })
  createCourse(
    @Body() dto: CreateTrainingCourseDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.trainingService.createCourse(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('courses/:id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a training course' })
  updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingCourseDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.trainingService.updateCourse(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('assignments')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign a course to workers' })
  assignTraining(
    @Body() dto: AssignTrainingDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.trainingService.assignTraining(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('assignments')
  @Roles(...TRAINING_ROLES)
  @ApiOperation({ summary: 'List training assignments (scoped)' })
  listAssignments(
    @Query() query: QueryTrainingAssignmentsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.trainingService.listAssignments(query, session.user.id);
  }

  @Patch('assignments/:id')
  @Roles(...TRAINING_ROLES)
  @ApiOperation({ summary: 'Update assignment status (e.g. in progress)' })
  updateAssignmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingAssignmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.trainingService.updateAssignmentStatus(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('assignments/:id/complete')
  @Roles(...TRAINING_ROLES)
  @ApiOperation({ summary: 'Self-attest or verify training completion' })
  completeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteTrainingAssignmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.trainingService.completeAssignment(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
