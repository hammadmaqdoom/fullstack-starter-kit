import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssignTrainingDto,
  CompleteTrainingAssignmentDto,
  CreateTrainingCourseDto,
  QueryTrainingAssignmentsDto,
  UpdateTrainingAssignmentDto,
  UpdateTrainingCourseDto,
} from './dto/training.dto';
import { TrainingAssignmentEntity } from './entities/training-assignment.entity';
import { TrainingCompletionEntity } from './entities/training-completion.entity';
import { TrainingCourseEntity } from './entities/training-course.entity';
import {
  TrainingAssignmentSource,
  TrainingAssignmentStatus,
  TrainingVerificationMethod,
} from './enums/training.enum';
import { isPeopleOpsOrAdmin } from './talent-scope.util';

type ActorContext = {
  userId: string;
  tenantId: string;
  correlationId?: string;
  ipAddress?: string;
};

/**
 * FLW-TAL-005 — training assignment & compliance. People Ops publishes the
 * catalog and assigns populations; employees self-attest completion which
 * manager/HR can verify.
 */
@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingCourseEntity)
    private readonly courseRepository: Repository<TrainingCourseEntity>,
    @InjectRepository(TrainingAssignmentEntity)
    private readonly assignmentRepository: Repository<TrainingAssignmentEntity>,
    @InjectRepository(TrainingCompletionEntity)
    private readonly completionRepository: Repository<TrainingCompletionEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  private async audit(
    actor: ActorContext,
    action: string,
    entityType: string,
    entityId: string,
    fields: Record<string, unknown>,
  ) {
    const changes = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        { old: null, new: value },
      ]),
    );
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action,
      entityType,
      entityId,
      changes,
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  async listCourses(tenantId = DIGITARO_TENANT_ID) {
    return this.courseRepository.find({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createCourse(dto: CreateTrainingCourseDto, actor: ActorContext) {
    const course = await this.courseRepository.save(
      this.courseRepository.create({
        tenantId: actor.tenantId,
        title: dto.title,
        description: dto.description ?? null,
        courseType: dto.courseType,
        durationMinutes: dto.durationMinutes ?? null,
        renewalPeriodMonths: dto.renewalPeriodMonths ?? null,
        externalUrl: dto.externalUrl ?? null,
        attachmentBlobUrl: dto.attachmentBlobUrl ?? null,
        countsTowardAwarenessControl: dto.countsTowardAwarenessControl ?? false,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(
      actor,
      'training_course.create',
      'training_course',
      course.id,
      {
        title: course.title,
        courseType: course.courseType,
      },
    );

    return course;
  }

  async updateCourse(
    id: string,
    dto: UpdateTrainingCourseDto,
    actor: ActorContext,
  ) {
    const course = await this.getCourseOrFail(id, actor.tenantId);
    Object.assign(course, dto);
    const saved = await this.courseRepository.save(course);
    await this.audit(
      actor,
      'training_course.update',
      'training_course',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  private async getCourseOrFail(id: string, tenantId: string) {
    const course = await this.courseRepository.findOne({
      where: { id, tenantId },
    });
    if (!course) {
      throw new NotFoundException({
        code: 'TRAINING_COURSE_NOT_FOUND',
        message: 'Training course not found',
      });
    }
    return course;
  }

  async assignTraining(dto: AssignTrainingDto, actor: ActorContext) {
    await this.getCourseOrFail(dto.courseId, actor.tenantId);

    const workers = await this.workerRepository.find({
      where: dto.workerIds.map((id) => ({ id, tenantId: actor.tenantId })),
    });
    if (workers.length !== dto.workerIds.length) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'One or more workers not found',
      });
    }

    const created: TrainingAssignmentEntity[] = [];
    for (const workerId of dto.workerIds) {
      const existing = await this.assignmentRepository.findOne({
        where: { tenantId: actor.tenantId, courseId: dto.courseId, workerId },
      });
      if (existing) continue;

      const assignment = await this.assignmentRepository.save(
        this.assignmentRepository.create({
          tenantId: actor.tenantId,
          courseId: dto.courseId,
          workerId,
          dueDate: dto.dueDate ?? null,
          status: TrainingAssignmentStatus.ASSIGNED,
          source: dto.source ?? TrainingAssignmentSource.MANUAL,
          assignedByUserId: actor.userId,
        }),
      );
      created.push(assignment);
    }

    await this.audit(
      actor,
      'training_assignment.create',
      'training_assignment',
      dto.courseId,
      {
        workerCount: created.length,
      },
    );

    return created;
  }

  async listAssignments(
    query: QueryTrainingAssignmentsDto,
    userId: string,
    tenantId = DIGITARO_TENANT_ID,
  ) {
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    const qb = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.course', 'course')
      .where('assignment.tenantId = :tenantId', { tenantId })
      .orderBy('assignment.createdAt', 'DESC');

    if (query.workerId) {
      qb.andWhere('assignment.workerId = :workerId', {
        workerId: query.workerId,
      });
    } else if (!isPeopleOpsOrAdmin(auth)) {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        userId,
        tenantId,
      );
      if (!actingWorkerId) return [];
      qb.andWhere('assignment.workerId = :actingWorkerId', { actingWorkerId });
    }

    if (query.courseId) {
      qb.andWhere('assignment.courseId = :courseId', {
        courseId: query.courseId,
      });
    }
    if (query.status) {
      qb.andWhere('assignment.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async updateAssignmentStatus(
    id: string,
    dto: UpdateTrainingAssignmentDto,
    actor: ActorContext,
  ) {
    const assignment = await this.getAssignmentOrFail(id, actor.tenantId);
    assignment.status = dto.status;
    const saved = await this.assignmentRepository.save(assignment);
    await this.audit(
      actor,
      'training_assignment.update',
      'training_assignment',
      id,
      {
        status: saved.status,
      },
    );
    return saved;
  }

  async completeAssignment(
    id: string,
    dto: CompleteTrainingAssignmentDto,
    actor: ActorContext,
  ) {
    const assignment = await this.getAssignmentOrFail(id, actor.tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      actor.tenantId,
    );
    const auth = await this.rbacService.getAuthContext(
      actor.userId,
      actor.tenantId,
    );

    const verificationMethod =
      dto.verificationMethod ?? TrainingVerificationMethod.SELF_ATTEST;
    const isSelfAttest =
      verificationMethod === TrainingVerificationMethod.SELF_ATTEST;

    if (isSelfAttest && assignment.workerId !== actingWorkerId) {
      throw new ForbiddenException({
        code: 'TRAINING_COMPLETION_DENIED',
        message: 'Only the assigned employee can self-attest completion',
      });
    }
    if (
      !isSelfAttest &&
      !isPeopleOpsOrAdmin(auth) &&
      !auth.roleCodes.includes(PolarisRoleCode.MANAGER)
    ) {
      throw new ForbiddenException({
        code: 'TRAINING_VERIFICATION_DENIED',
        message: 'Manager or People Ops verification required',
      });
    }

    const existing = await this.completionRepository.findOne({
      where: { tenantId: actor.tenantId, assignmentId: id },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'TRAINING_ALREADY_COMPLETED',
        message: 'This assignment has already been completed',
      });
    }

    const completion = await this.completionRepository.save(
      this.completionRepository.create({
        tenantId: actor.tenantId,
        assignmentId: id,
        completedAt: new Date(),
        verificationMethod,
        verifiedByUserId: isSelfAttest ? null : actor.userId,
        certificateBlobUrl: dto.certificateBlobUrl ?? null,
        notes: dto.notes ?? null,
      }),
    );

    assignment.status = TrainingAssignmentStatus.COMPLETED;
    await this.assignmentRepository.save(assignment);

    await this.audit(
      actor,
      'training_assignment.complete',
      'training_completion',
      completion.id,
      {
        assignmentId: id,
        verificationMethod,
      },
    );

    return completion;
  }

  private async getAssignmentOrFail(id: string, tenantId: string) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id, tenantId },
    });
    if (!assignment) {
      throw new NotFoundException({
        code: 'TRAINING_ASSIGNMENT_NOT_FOUND',
        message: 'Training assignment not found',
      });
    }
    return assignment;
  }
}
