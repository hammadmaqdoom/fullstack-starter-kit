import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertExitInterviewDto } from './dto/pre-boarding.dto';
import { ExitInterviewEntity } from './entities/exit-interview.entity';
import { SeparationCaseEntity } from './entities/separation-case.entity';
import { ExitInterviewStatus } from './enums/onboarding.enum';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

/** Keys redacted for non–People Ops (managers see metadata only). */
const RESTRICTED_RESPONSE_KEYS = [
  'reasonForLeaving',
  'managerFeedback',
  'compensationFeedback',
  'freeText',
  'wouldRecommend',
];

@Injectable()
export class ExitInterviewService {
  constructor(
    @InjectRepository(ExitInterviewEntity)
    private readonly interviewRepository: Repository<ExitInterviewEntity>,
    @InjectRepository(SeparationCaseEntity)
    private readonly separationRepository: Repository<SeparationCaseEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async upsert(
    separationId: string,
    dto: UpsertExitInterviewDto,
    actor: ActorContext,
  ): Promise<ExitInterviewEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);

    const separation = await this.separationRepository.findOne({
      where: { id: separationId, tenantId },
    });
    if (!separation) {
      throw new NotFoundException({
        code: 'SEPARATION_NOT_FOUND',
        message: 'Separation case not found',
      });
    }

    let interview = await this.interviewRepository.findOne({
      where: { tenantId, separationCaseId: separationId },
    });

    const previousStatus = interview?.status ?? null;
    const status = dto.status ?? ExitInterviewStatus.SUBMITTED;

    if (!interview) {
      interview = this.interviewRepository.create({
        tenantId,
        separationCaseId: separationId,
        workerId: separation.workerId,
        status,
        responses: dto.responses ?? {},
        conductedBy: actor.userId,
        conductedAt: new Date(),
      });
    } else {
      interview.responses = {
        ...interview.responses,
        ...(dto.responses ?? {}),
      };
      interview.status = status;
      interview.conductedBy = actor.userId;
      interview.conductedAt = new Date();
    }

    const saved = await this.interviewRepository.save(interview);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'exit_interview.upsert',
      entityType: 'exit_interview',
      entityId: saved.id,
      changes: {
        status: { old: previousStatus, new: saved.status },
        separationCaseId: { old: null, new: separationId },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async get(
    separationId: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<Partial<ExitInterviewEntity>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPeopleOps = auth.roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );
    const isManager = auth.roleCodes.some((code) =>
      [PolarisRoleCode.MANAGER, PolarisRoleCode.DIVISION_HEAD].includes(
        code as PolarisRoleCode,
      ),
    );

    if (!isPeopleOps && !isManager) {
      throw new ForbiddenException({
        code: 'EXIT_INTERVIEW_ACCESS_DENIED',
        message: 'Insufficient role for exit interview access',
      });
    }

    const interview = await this.interviewRepository.findOne({
      where: { tenantId, separationCaseId: separationId },
    });
    if (!interview) {
      throw new NotFoundException({
        code: 'EXIT_INTERVIEW_NOT_FOUND',
        message: 'Exit interview not found',
      });
    }

    if (isPeopleOps) {
      return interview;
    }

    return this.redact(interview);
  }

  private redact(interview: ExitInterviewEntity): Partial<ExitInterviewEntity> {
    const redactedResponses: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(interview.responses ?? {})) {
      if (RESTRICTED_RESPONSE_KEYS.includes(key)) {
        redactedResponses[key] = '[REDACTED]';
      } else {
        redactedResponses[key] = value;
      }
    }

    return {
      id: interview.id,
      tenantId: interview.tenantId,
      separationCaseId: interview.separationCaseId,
      workerId: interview.workerId,
      status: interview.status,
      responses: redactedResponses,
      conductedBy: interview.conductedBy,
      conductedAt: interview.conductedAt,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }

  private async assertPeopleOps(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const allowed = auth.roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: 'EXIT_INTERVIEW_ACCESS_DENIED',
        message: 'People Ops access required to write exit interviews',
      });
    }
  }
}
