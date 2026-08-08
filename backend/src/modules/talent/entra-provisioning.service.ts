import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  DIGITARO_TENANT_ID,
  SYSTEM_ACTOR_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { EntraStatus } from '@/modules/core-hr/enums/worker.enum';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntraProvisioningJobEntity } from './entities/entra-provisioning-job.entity';
import { EntraProvisioningJobStatus } from './enums/onboarding.enum';
import {
  IMicrosoftGraphIdentityService,
  MICROSOFT_GRAPH_IDENTITY,
} from './interfaces/microsoft-graph-identity.interface';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

const DEFAULT_LEAD_DAYS = 3;

@Injectable()
export class EntraProvisioningService {
  private readonly logger = new Logger(EntraProvisioningService.name);

  constructor(
    @InjectRepository(EntraProvisioningJobEntity)
    private readonly jobRepository: Repository<EntraProvisioningJobEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    @Inject(MICROSOFT_GRAPH_IDENTITY)
    private readonly graph: IMicrosoftGraphIdentityService,
  ) {}

  /**
   * FLW-SEC-006 — schedule Graph provision for start_date − N days.
   * Returns null when entra_status is not_required (contractors).
   */
  async scheduleProvision(
    workerId: string,
    startDate: string,
    actor?: ActorContext,
  ): Promise<EntraProvisioningJobEntity | null> {
    const tenantId = actor?.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    if (worker.entraStatus === EntraStatus.NOT_REQUIRED) {
      this.logger.debug(
        `Skipping Entra provision for worker ${workerId} (not_required)`,
      );
      return null;
    }

    const scheduledFor = new Date(startDate);
    scheduledFor.setUTCDate(scheduledFor.getUTCDate() - DEFAULT_LEAD_DAYS);

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        tenantId,
        workerId,
        scheduledFor,
        status: EntraProvisioningJobStatus.SCHEDULED,
        workEmail: worker.email,
        entraObjectId: worker.entraObjectId,
        graphCorrelationId: null,
        attemptCount: 0,
        lastError: null,
        completedAt: null,
      }),
    );

    worker.entraStatus = EntraStatus.PENDING;
    await this.workerRepository.save(worker);

    await this.auditLogService.append({
      tenantId,
      actorId: this.resolveActorId(actor),
      action: 'entra.provision.schedule',
      entityType: 'entra_provisioning_job',
      entityId: job.id,
      changes: {
        workerId: { old: null, new: workerId },
        scheduledFor: { old: null, new: scheduledFor.toISOString() },
        status: { old: null, new: EntraProvisioningJobStatus.SCHEDULED },
      },
      correlationId: actor?.correlationId,
      ipAddress: actor?.ipAddress,
    });

    // Attempt stub Graph call immediately for visibility in logs.
    await this.runProvisionStub(job, worker);

    return this.jobRepository.findOneOrFail({ where: { id: job.id } });
  }

  async disableAccount(
    workerId: string,
    actor?: ActorContext,
  ): Promise<{ success: boolean; reason: string }> {
    const tenantId = actor?.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    const result = await this.graph.disableUser({
      workerId,
      entraObjectId: worker.entraObjectId,
    });

    await this.auditLogService.append({
      tenantId,
      actorId: this.resolveActorId(actor),
      action: 'entra.account.disable',
      entityType: 'worker',
      entityId: workerId,
      changes: {
        graphResult: { old: null, new: result.reason },
        stubbed: { old: null, new: !this.graph.isConfigured() },
      },
      correlationId: actor?.correlationId,
      ipAddress: actor?.ipAddress,
    });

    return result;
  }

  async listJobs(
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<EntraProvisioningJobEntity[]> {
    await this.assertItOrPeopleOps(actorId, tenantId);
    return this.jobRepository.find({
      where: { tenantId },
      order: { scheduledFor: 'DESC' },
      take: 100,
    });
  }

  async retry(
    jobId: string,
    actor: ActorContext,
  ): Promise<EntraProvisioningJobEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertItOrPeopleOps(actor.userId, tenantId);

    const job = await this.jobRepository.findOne({
      where: { id: jobId, tenantId },
    });
    if (!job) {
      throw new NotFoundException({
        code: 'ENTRA_JOB_NOT_FOUND',
        message: 'Entra provisioning job not found',
      });
    }

    if (
      ![
        EntraProvisioningJobStatus.FAILED,
        EntraProvisioningJobStatus.SCHEDULED,
      ].includes(job.status)
    ) {
      throw new BadRequestException({
        code: 'INVALID_JOB_STATUS',
        message: 'Only failed or scheduled jobs can be retried',
      });
    }

    const worker = await this.workerRepository.findOneOrFail({
      where: { id: job.workerId, tenantId },
    });

    job.status = EntraProvisioningJobStatus.RUNNING;
    job.attemptCount += 1;
    await this.jobRepository.save(job);

    await this.runProvisionStub(job, worker);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'entra.provision.retry',
      entityType: 'entra_provisioning_job',
      entityId: job.id,
      changes: {
        attemptCount: { old: job.attemptCount - 1, new: job.attemptCount },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.jobRepository.findOneOrFail({ where: { id: job.id } });
  }

  async completeManual(
    jobId: string,
    actor: ActorContext,
  ): Promise<EntraProvisioningJobEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertItOrPeopleOps(actor.userId, tenantId);

    const job = await this.jobRepository.findOne({
      where: { id: jobId, tenantId },
    });
    if (!job) {
      throw new NotFoundException({
        code: 'ENTRA_JOB_NOT_FOUND',
        message: 'Entra provisioning job not found',
      });
    }

    const previous = job.status;
    job.status = EntraProvisioningJobStatus.MANUAL_COMPLETE;
    job.completedAt = new Date();
    job.lastError = null;
    await this.jobRepository.save(job);

    const worker = await this.workerRepository.findOne({
      where: { id: job.workerId, tenantId },
    });
    if (worker) {
      worker.entraStatus = EntraStatus.PROVISIONED;
      await this.workerRepository.save(worker);
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'entra.provision.manual_complete',
      entityType: 'entra_provisioning_job',
      entityId: job.id,
      changes: {
        status: {
          old: previous,
          new: EntraProvisioningJobStatus.MANUAL_COMPLETE,
        },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return job;
  }

  private async runProvisionStub(
    job: EntraProvisioningJobEntity,
    worker: WorkerEntity,
  ): Promise<void> {
    const result = await this.graph.createOrEnableUser({
      workerId: worker.id,
      workEmail: job.workEmail ?? worker.email,
      displayName: `${worker.firstName} ${worker.lastName}`.trim(),
    });

    if (result.success) {
      job.status = EntraProvisioningJobStatus.SUCCEEDED;
      job.entraObjectId = result.entraObjectId;
      job.completedAt = new Date();
      job.lastError = null;
      worker.entraStatus = EntraStatus.PROVISIONED;
      worker.entraObjectId = result.entraObjectId;
      await this.workerRepository.save(worker);
    } else {
      job.status = EntraProvisioningJobStatus.FAILED;
      job.lastError = result.reason;
    }
    await this.jobRepository.save(job);
  }

  /** audit_log.actorId is a strict uuid column — 'system'/missing actor must map to SYSTEM_ACTOR_ID. */
  private resolveActorId(actor?: ActorContext): string {
    if (!actor?.userId || actor.userId === 'system') {
      return SYSTEM_ACTOR_ID;
    }
    return actor.userId;
  }

  private async assertItOrPeopleOps(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const allowed = auth.roleCodes.some((code) =>
      [
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
        PolarisRoleCode.IT_ADMIN,
      ].includes(code as PolarisRoleCode),
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: 'ENTRA_JOB_ACCESS_DENIED',
        message: 'IT Admin or People Ops access required',
      });
    }
  }
}
