import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
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
  CreateCandidateDto,
  CreateInterviewScorecardDto,
  CreateJobRequisitionDto,
  QueryCandidatesDto,
  UpdateCandidateStatusDto,
  UpdateJobRequisitionDto,
} from './dto/recruitment.dto';
import { CandidateEntity } from './entities/candidate.entity';
import { InterviewScorecardEntity } from './entities/interview-scorecard.entity';
import { JobRequisitionEntity } from './entities/job-requisition.entity';
import { ManpowerPositionEntity } from './entities/manpower-position.entity';
import { ManpowerPositionStatus } from './enums/manpower.enum';
import { CandidateStatus, RequisitionStatus } from './enums/recruitment.enum';
import { isPeopleOpsOrAdmin } from './talent-scope.util';

type ActorContext = {
  userId: string;
  tenantId: string;
  correlationId?: string;
  ipAddress?: string;
};

/**
 * FLW-TAL-001 — requisition to hire. Approval chain: hiring manager (draft)
 * → Division Head → People Ops → Open. Candidates flow through the
 * screening pipeline; scorecards capture structured ISO 10667 assessment.
 */
@Injectable()
export class RecruitmentService {
  constructor(
    @InjectRepository(JobRequisitionEntity)
    private readonly requisitionRepository: Repository<JobRequisitionEntity>,
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
    @InjectRepository(InterviewScorecardEntity)
    private readonly scorecardRepository: Repository<InterviewScorecardEntity>,
    @InjectRepository(ManpowerPositionEntity)
    private readonly manpowerPositionRepository: Repository<ManpowerPositionEntity>,
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

  async listRequisitions(userId: string, tenantId = DIGITARO_TENANT_ID) {
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    const qb = this.requisitionRepository
      .createQueryBuilder('requisition')
      .where('requisition.tenantId = :tenantId', { tenantId })
      .orderBy('requisition.createdAt', 'DESC');

    if (!isPeopleOpsOrAdmin(auth)) {
      qb.andWhere(
        'requisition.hiringManagerWorkerId = :userId OR requisition.requestedByUserId = :userId',
        {
          userId,
        },
      );
    }

    return qb.getMany();
  }

  async getRequisition(id: string, tenantId = DIGITARO_TENANT_ID) {
    const requisition = await this.requisitionRepository.findOne({
      where: { id, tenantId },
    });
    if (!requisition) {
      throw new NotFoundException({
        code: 'REQUISITION_NOT_FOUND',
        message: 'Job requisition not found',
      });
    }
    return requisition;
  }

  async createRequisition(dto: CreateJobRequisitionDto, actor: ActorContext) {
    if (dto.manpowerPositionId) {
      await this.getManpowerPositionOrFail(
        dto.manpowerPositionId,
        actor.tenantId,
      );
    }

    const requisition = await this.requisitionRepository.save(
      this.requisitionRepository.create({
        tenantId: actor.tenantId,
        title: dto.title,
        divisionId: dto.divisionId ?? null,
        departmentId: dto.departmentId ?? null,
        employmentTypeId: dto.employmentTypeId,
        countryCode: dto.countryCode,
        manpowerPositionId: dto.manpowerPositionId ?? null,
        hiringManagerWorkerId: dto.hiringManagerWorkerId,
        headcount: dto.headcount ?? 1,
        budgetBandMin: dto.budgetBandMin ?? null,
        budgetBandMax: dto.budgetBandMax ?? null,
        justification: dto.justification ?? null,
        status: RequisitionStatus.PENDING_DIVISION_HEAD,
        requestedByUserId: actor.userId,
      }),
    );

    await this.audit(
      actor,
      'requisition.create',
      'job_requisition',
      requisition.id,
      {
        title: requisition.title,
        status: requisition.status,
      },
    );

    return requisition;
  }

  async updateRequisition(
    id: string,
    dto: UpdateJobRequisitionDto,
    actor: ActorContext,
  ) {
    const auth = await this.rbacService.getAuthContext(
      actor.userId,
      actor.tenantId,
    );
    const requisition = await this.getRequisition(id, actor.tenantId);

    if (dto.status) {
      this.assertRequisitionTransitionAllowed(
        requisition.status,
        dto.status,
        auth.roleCodes,
      );
      if (dto.status === RequisitionStatus.PENDING_PEOPLE_OPS) {
        requisition.approvedAt = new Date();
      }
      if (dto.status === RequisitionStatus.OPEN) {
        requisition.approvedAt = requisition.approvedAt ?? new Date();
        requisition.openedAt = new Date();
      }
      if (
        [RequisitionStatus.CLOSED, RequisitionStatus.CANCELLED].includes(
          dto.status,
        )
      ) {
        requisition.closedAt = new Date();
      }
      requisition.status = dto.status;
    }
    if (dto.title != null) requisition.title = dto.title;
    if (dto.headcount != null) requisition.headcount = dto.headcount;
    if (dto.justification != null)
      requisition.justification = dto.justification;

    const saved = await this.requisitionRepository.save(requisition);
    await this.audit(actor, 'requisition.update', 'job_requisition', id, {
      status: saved.status,
    });
    return saved;
  }

  private assertRequisitionTransitionAllowed(
    current: RequisitionStatus,
    next: RequisitionStatus,
    roleCodes: string[],
  ) {
    const isDivisionHeadStep =
      current === RequisitionStatus.PENDING_DIVISION_HEAD &&
      next === RequisitionStatus.PENDING_PEOPLE_OPS;
    const isPeopleOpsStep =
      current === RequisitionStatus.PENDING_PEOPLE_OPS &&
      next === RequisitionStatus.OPEN;
    const isPeopleOpsOnly = [
      RequisitionStatus.ON_HOLD,
      RequisitionStatus.CLOSED,
      RequisitionStatus.CANCELLED,
    ].includes(next);

    if (isDivisionHeadStep) {
      if (
        !roleCodes.some((c) =>
          ['division_head', 'people_ops', 'super_admin'].includes(c),
        )
      ) {
        throw new ForbiddenException({
          code: 'REQUISITION_APPROVAL_DENIED',
          message: 'Division Head approval required',
        });
      }
      return;
    }
    if (isPeopleOpsStep || isPeopleOpsOnly) {
      if (!roleCodes.some((c) => ['people_ops', 'super_admin'].includes(c))) {
        throw new ForbiddenException({
          code: 'REQUISITION_APPROVAL_DENIED',
          message: 'People Ops approval required',
        });
      }
      return;
    }
    throw new BadRequestException({
      code: 'INVALID_REQUISITION_TRANSITION',
      message: `Cannot move requisition from ${current} to ${next}`,
    });
  }

  private async getManpowerPositionOrFail(id: string, tenantId: string) {
    const position = await this.manpowerPositionRepository.findOne({
      where: { id, tenantId },
    });
    if (!position) {
      throw new NotFoundException({
        code: 'MANPOWER_POSITION_NOT_FOUND',
        message: 'Manpower position not found',
      });
    }
    return position;
  }

  // --- Candidates ---

  async listCandidates(
    query: QueryCandidatesDto,
    tenantId = DIGITARO_TENANT_ID,
  ) {
    const qb = this.candidateRepository
      .createQueryBuilder('candidate')
      .where('candidate.tenantId = :tenantId', { tenantId })
      .orderBy('candidate.createdAt', 'DESC');

    if (query.requisitionId) {
      qb.andWhere('candidate.requisitionId = :requisitionId', {
        requisitionId: query.requisitionId,
      });
    }
    if (query.status) {
      qb.andWhere('candidate.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async getCandidate(id: string, tenantId = DIGITARO_TENANT_ID) {
    const candidate = await this.candidateRepository.findOne({
      where: { id, tenantId },
    });
    if (!candidate) {
      throw new NotFoundException({
        code: 'CANDIDATE_NOT_FOUND',
        message: 'Candidate not found',
      });
    }
    return candidate;
  }

  async createCandidate(dto: CreateCandidateDto, actor: ActorContext) {
    const requisition = await this.getRequisition(
      dto.requisitionId,
      actor.tenantId,
    );
    if (requisition.status !== RequisitionStatus.OPEN) {
      throw new BadRequestException({
        code: 'REQUISITION_NOT_OPEN',
        message: 'Candidates can only be added to open requisitions',
      });
    }

    const existing = await this.candidateRepository.findOne({
      where: {
        tenantId: actor.tenantId,
        requisitionId: dto.requisitionId,
        email: dto.email,
      },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'DUPLICATE_CANDIDATE',
        message:
          'A candidate with this email already applied to this requisition',
      });
    }

    const candidate = await this.candidateRepository.save(
      this.candidateRepository.create({
        tenantId: actor.tenantId,
        requisitionId: dto.requisitionId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone ?? null,
        source: dto.source ?? null,
        cvBlobUrl: dto.cvBlobUrl ?? null,
        notes: dto.notes ?? null,
        status: CandidateStatus.APPLIED,
        consentAt: new Date(),
        consentIp: actor.ipAddress ?? null,
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(actor, 'candidate.create', 'candidate', candidate.id, {
      requisitionId: dto.requisitionId,
      email: candidate.email,
    });

    return candidate;
  }

  async updateCandidateStatus(
    id: string,
    dto: UpdateCandidateStatusDto,
    actor: ActorContext,
  ) {
    const candidate = await this.getCandidate(id, actor.tenantId);
    const before = candidate.status;

    candidate.status = dto.status;
    if (dto.status === CandidateStatus.REJECTED) {
      candidate.rejectedReason = dto.rejectedReason ?? candidate.rejectedReason;
    }

    const saved = await this.candidateRepository.save(candidate);

    if (
      dto.status === CandidateStatus.HIRED &&
      before !== CandidateStatus.HIRED
    ) {
      await this.onCandidateHired(saved, actor);
    }

    await this.audit(actor, 'candidate.status_change', 'candidate', id, {
      from: before,
      to: saved.status,
    });

    return saved;
  }

  private async onCandidateHired(
    candidate: CandidateEntity,
    actor: ActorContext,
  ) {
    const requisition = await this.getRequisition(
      candidate.requisitionId,
      actor.tenantId,
    );
    requisition.filledCount += 1;
    if (requisition.filledCount >= requisition.headcount) {
      requisition.status = RequisitionStatus.CLOSED;
      requisition.closedAt = new Date();
    }
    await this.requisitionRepository.save(requisition);

    if (requisition.manpowerPositionId) {
      const position = await this.manpowerPositionRepository.findOne({
        where: { id: requisition.manpowerPositionId, tenantId: actor.tenantId },
      });
      if (position) {
        position.filledCount += 1;
        if (position.filledCount >= position.headcount) {
          position.status = ManpowerPositionStatus.FILLED;
        }
        await this.manpowerPositionRepository.save(position);
      }
    }

    await this.audit(
      actor,
      'requisition.headcount_filled',
      'job_requisition',
      requisition.id,
      {
        filledCount: requisition.filledCount,
        headcount: requisition.headcount,
      },
    );
  }

  // --- Interview scorecards ---

  async listScorecards(candidateId: string, tenantId = DIGITARO_TENANT_ID) {
    return this.scorecardRepository.find({
      where: { tenantId, candidateId },
      order: { createdAt: 'DESC' },
    });
  }

  async createScorecard(
    candidateId: string,
    dto: CreateInterviewScorecardDto,
    actor: ActorContext,
  ) {
    await this.getCandidate(candidateId, actor.tenantId);

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      actor.tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'WORKER_PROFILE_REQUIRED',
        message: 'Worker profile required to submit a scorecard',
      });
    }

    const totalWeight = dto.criteria.reduce((sum, c) => sum + c.weight, 0);
    const weightedScore =
      totalWeight > 0
        ? dto.criteria.reduce(
            (sum, c) => sum + (c.score * c.weight) / totalWeight,
            0,
          )
        : null;

    const scorecard = await this.scorecardRepository.save(
      this.scorecardRepository.create({
        tenantId: actor.tenantId,
        candidateId,
        stage: dto.stage,
        interviewerWorkerId: actingWorkerId,
        criteria: dto.criteria,
        overallScore: weightedScore != null ? weightedScore.toFixed(2) : null,
        recommendation: dto.recommendation ?? null,
        notes: dto.notes ?? null,
        interviewedAt: dto.interviewedAt
          ? new Date(dto.interviewedAt)
          : new Date(),
      }),
    );

    await this.audit(
      actor,
      'scorecard.create',
      'interview_scorecard',
      scorecard.id,
      {
        candidateId,
        stage: scorecard.stage,
        recommendation: scorecard.recommendation,
      },
    );

    return scorecard;
  }
}
