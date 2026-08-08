import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  DIGITARO_TENANT_ID,
  SYSTEM_ACTOR_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DocumentService } from '@/modules/documents/document.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  CompleteOnboardingTaskDto,
  CreateOnboardingCaseDto,
  CreateOnboardingTemplateDto,
} from './dto/onboarding.dto';
import { OnboardingCaseEntity } from './entities/onboarding-case.entity';
import { OnboardingTaskEntity } from './entities/onboarding-task.entity';
import { OnboardingTemplateTaskEntity } from './entities/onboarding-template-task.entity';
import { OnboardingTemplateEntity } from './entities/onboarding-template.entity';
import { EntraProvisioningService } from './entra-provisioning.service';
import {
  OnboardingCaseStatus,
  OnboardingTaskStatus,
  OnboardingTemplateStatus,
} from './enums/onboarding.enum';
import { redactNestedWorker } from './talent-response.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(OnboardingTemplateEntity)
    private readonly templateRepository: Repository<OnboardingTemplateEntity>,
    @InjectRepository(OnboardingCaseEntity)
    private readonly caseRepository: Repository<OnboardingCaseEntity>,
    @InjectRepository(OnboardingTaskEntity)
    private readonly taskRepository: Repository<OnboardingTaskEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
    private readonly entraProvisioningService: EntraProvisioningService,
    @Optional() private readonly documentService?: DocumentService,
  ) {}

  async listTemplates(
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<OnboardingTemplateEntity[]> {
    await this.assertPeopleOps(actorId, tenantId);
    return this.templateRepository.find({
      where: { tenantId },
      relations: ['tasks'],
      order: { updatedAt: 'DESC', tasks: { sortOrder: 'ASC' } },
    });
  }

  async createTemplate(
    dto: CreateOnboardingTemplateDto,
    actor: ActorContext,
  ): Promise<OnboardingTemplateEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);

    const saved = await this.dataSource.transaction(async (manager) => {
      const template = await manager.save(
        OnboardingTemplateEntity,
        manager.create(OnboardingTemplateEntity, {
          tenantId,
          name: dto.name,
          countryCode: dto.countryCode ?? null,
          employmentTypeId: dto.employmentTypeId ?? null,
          version: 1,
          status: OnboardingTemplateStatus.DRAFT,
        }),
      );

      if (dto.tasks?.length) {
        await manager.save(
          OnboardingTemplateTaskEntity,
          dto.tasks.map((task, index) =>
            manager.create(OnboardingTemplateTaskEntity, {
              templateId: template.id,
              title: task.title,
              assigneeRole: task.assigneeRole,
              sortOrder: task.sortOrder ?? index,
              isRequired: task.isRequired ?? true,
              dueOffsetDays: task.dueOffsetDays ?? 0,
            }),
          ),
        );
      }

      return template;
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'onboarding.template.create',
      entityType: 'onboarding_template',
      entityId: saved.id,
      changes: {
        name: { old: null, new: saved.name },
        status: { old: null, new: saved.status },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.getTemplateOrFail(saved.id, tenantId);
  }

  async publishTemplate(
    templateId: string,
    actor: ActorContext,
  ): Promise<OnboardingTemplateEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);

    const template = await this.getTemplateOrFail(templateId, tenantId);
    if (template.status === OnboardingTemplateStatus.PUBLISHED) {
      throw new BadRequestException({
        code: 'TEMPLATE_ALREADY_PUBLISHED',
        message: 'Template is already published',
      });
    }

    if (!template.tasks?.length) {
      throw new BadRequestException({
        code: 'TEMPLATE_HAS_NO_TASKS',
        message: 'Publish requires at least one template task',
      });
    }

    const previousStatus = template.status;
    template.status = OnboardingTemplateStatus.PUBLISHED;
    const saved = await this.templateRepository.save(template);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'onboarding.template.publish',
      entityType: 'onboarding_template',
      entityId: saved.id,
      changes: {
        status: { old: previousStatus, new: saved.status },
        version: { old: null, new: saved.version },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.getTemplateOrFail(saved.id, tenantId);
  }

  async createCase(
    dto: CreateOnboardingCaseDto,
    actor: ActorContext,
  ): Promise<OnboardingCaseEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);

    const worker = await this.workerRepository.findOne({
      where: { id: dto.workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    const template = await this.getTemplateOrFail(dto.templateId, tenantId);
    if (template.status !== OnboardingTemplateStatus.PUBLISHED) {
      throw new BadRequestException({
        code: 'TEMPLATE_NOT_PUBLISHED',
        message: 'Onboarding cases require a published template',
      });
    }

    const saved = await this.buildOnboardingCase(
      dto.workerId,
      template,
      dto.startDate,
      tenantId,
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'onboarding.case.create',
      entityType: 'onboarding_case',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: dto.workerId },
        templateId: { old: null, new: dto.templateId },
        status: { old: null, new: OnboardingCaseStatus.IN_PROGRESS },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    // FLW-SEC-006: schedule Entra provision around start date
    await this.provisionEntraAccount(dto.workerId, dto.startDate, actor);

    // FLW-TAL-002 / FLW-DOC-002: auto-generate document bundle on onboarding start
    await this.autoGenerateDocuments(dto.workerId, saved.id, actor);

    const auth = await this.rbacService.getAuthContext(actor.userId, tenantId);
    return this.getCaseOrFail(saved.id, tenantId, auth);
  }

  /**
   * System entry point for day-1 onboarding — invoked by the pre-boarding merge
   * job (FLW-TAL-006) once a candidate's packet is merged on their start date.
   * Skips actor RBAC (no HTTP actor in job context); audits as `actorId: 'system'`.
   * Resolves the best-matching published template (country + employment type,
   * falling back to a country-agnostic default) and no-ops with an audit entry
   * if none is published yet, rather than failing the merge.
   */
  async createCaseSystem(
    workerId: string,
    startDate: string,
    tenantId: string = DIGITARO_TENANT_ID,
    correlationId?: string,
  ): Promise<OnboardingCaseEntity | null> {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      this.logger.warn(`createCaseSystem: worker ${workerId} not found`);
      return null;
    }

    const existing = await this.caseRepository.findOne({
      where: { tenantId, workerId },
    });
    if (existing) {
      this.logger.debug(
        `createCaseSystem: onboarding case already exists for worker ${workerId}`,
      );
      return this.getCaseOrFail(existing.id, tenantId);
    }

    const template = await this.resolveDefaultTemplate(
      worker.countryCode,
      worker.employmentTypeId ?? null,
      tenantId,
    );

    if (!template) {
      await this.auditLogService.append({
        tenantId,
        actorId: SYSTEM_ACTOR_ID,
        action: 'onboarding.case.skip',
        entityType: 'worker',
        entityId: workerId,
        changes: {
          reason: { old: null, new: 'no_published_template' },
        },
        correlationId,
      });
      return null;
    }

    const saved = await this.buildOnboardingCase(
      workerId,
      template,
      startDate,
      tenantId,
    );

    await this.auditLogService.append({
      tenantId,
      actorId: SYSTEM_ACTOR_ID,
      action: 'onboarding.case.create',
      entityType: 'onboarding_case',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: workerId },
        templateId: { old: null, new: template.id },
        status: { old: null, new: OnboardingCaseStatus.IN_PROGRESS },
        trigger: { old: null, new: 'pre_boarding_merge' },
      },
      correlationId,
    });

    await this.provisionEntraAccount(workerId, startDate, {
      userId: 'system',
      tenantId,
      correlationId,
    });

    return this.getCaseOrFail(saved.id, tenantId);
  }

  private async buildOnboardingCase(
    workerId: string,
    template: OnboardingTemplateEntity,
    startDate: string,
    tenantId: string,
  ): Promise<OnboardingCaseEntity> {
    return this.dataSource.transaction(async (manager) => {
      const onboardingCase = await manager.save(
        OnboardingCaseEntity,
        manager.create(OnboardingCaseEntity, {
          tenantId,
          workerId,
          templateId: template.id,
          status: OnboardingCaseStatus.IN_PROGRESS,
          startDate,
        }),
      );

      const templateTasks = [...(template.tasks ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );

      if (templateTasks.length) {
        await manager.save(
          OnboardingTaskEntity,
          templateTasks.map((templateTask) =>
            manager.create(OnboardingTaskEntity, {
              caseId: onboardingCase.id,
              templateTaskId: templateTask.id,
              status: OnboardingTaskStatus.PENDING,
              assigneeWorkerId: null,
              completedAt: null,
              notes: null,
            }),
          ),
        );
      }

      return onboardingCase;
    });
  }

  /**
   * Resolution order: countryCode + employmentTypeId exact match > countryCode
   * match (employmentTypeId agnostic) > country-agnostic default. Published only.
   */
  private async resolveDefaultTemplate(
    countryCode: string | undefined,
    employmentTypeId: string | null,
    tenantId: string,
  ): Promise<OnboardingTemplateEntity | null> {
    const base = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.tasks', 'tasks')
      .where('template.tenantId = :tenantId', { tenantId })
      .andWhere('template.status = :status', {
        status: OnboardingTemplateStatus.PUBLISHED,
      })
      .orderBy('tasks.sortOrder', 'ASC');

    if (countryCode && employmentTypeId) {
      const exact = await base
        .clone()
        .andWhere('template.countryCode = :countryCode', { countryCode })
        .andWhere('template.employmentTypeId = :employmentTypeId', {
          employmentTypeId,
        })
        .getOne();
      if (exact) {
        return exact;
      }
    }

    if (countryCode) {
      const byCountry = await base
        .clone()
        .andWhere('template.countryCode = :countryCode', { countryCode })
        .getOne();
      if (byCountry) {
        return byCountry;
      }
    }

    return base.clone().andWhere('template.countryCode IS NULL').getOne();
  }

  async getCase(
    caseId: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<OnboardingCaseEntity> {
    await this.assertPeopleOpsOrManager(actorId, tenantId);
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    return this.getCaseOrFail(caseId, tenantId, auth);
  }

  async completeTask(
    taskId: string,
    dto: CompleteOnboardingTaskDto,
    actor: ActorContext,
  ): Promise<OnboardingCaseEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOpsOrManager(actor.userId, tenantId);

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['onboardingCase', 'templateTask'],
    });
    if (!task?.onboardingCase || task.onboardingCase.tenantId !== tenantId) {
      throw new NotFoundException({
        code: 'ONBOARDING_TASK_NOT_FOUND',
        message: 'Onboarding task not found',
      });
    }

    if (
      task.status === OnboardingTaskStatus.DONE ||
      task.status === OnboardingTaskStatus.SKIPPED
    ) {
      throw new BadRequestException({
        code: 'TASK_ALREADY_COMPLETED',
        message: 'Task is already completed or skipped',
      });
    }

    const caseId = task.caseId;

    await this.dataSource.transaction(async (manager) => {
      task.status = OnboardingTaskStatus.DONE;
      task.completedAt = new Date();
      task.notes = dto.notes ?? task.notes;
      await manager.save(OnboardingTaskEntity, task);

      const siblingTasks = await manager.find(OnboardingTaskEntity, {
        where: { caseId },
        relations: ['templateTask'],
      });

      const requiredIncomplete = siblingTasks.filter((sibling) => {
        const isRequired = sibling.templateTask?.isRequired ?? true;
        if (!isRequired) {
          return false;
        }
        return (
          sibling.status !== OnboardingTaskStatus.DONE &&
          sibling.status !== OnboardingTaskStatus.SKIPPED
        );
      });

      const onboardingCase = await manager.findOne(OnboardingCaseEntity, {
        where: { id: caseId, tenantId },
      });
      if (!onboardingCase) {
        throw new NotFoundException({
          code: 'ONBOARDING_CASE_NOT_FOUND',
          message: 'Onboarding case not found',
        });
      }

      if (requiredIncomplete.length === 0) {
        const previousStatus = onboardingCase.status;
        onboardingCase.status = OnboardingCaseStatus.COMPLETE;
        await manager.save(OnboardingCaseEntity, onboardingCase);

        await this.auditLogService.append({
          tenantId,
          actorId: actor.userId,
          action: 'onboarding.case.complete',
          entityType: 'onboarding_case',
          entityId: onboardingCase.id,
          changes: {
            status: { old: previousStatus, new: OnboardingCaseStatus.COMPLETE },
          },
          correlationId: actor.correlationId,
          ipAddress: actor.ipAddress,
        });
      } else if (onboardingCase.status === OnboardingCaseStatus.NOT_STARTED) {
        onboardingCase.status = OnboardingCaseStatus.IN_PROGRESS;
        await manager.save(OnboardingCaseEntity, onboardingCase);
      }
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'onboarding.task.complete',
      entityType: 'onboarding_task',
      entityId: taskId,
      changes: {
        status: {
          old: OnboardingTaskStatus.PENDING,
          new: OnboardingTaskStatus.DONE,
        },
        caseId: { old: null, new: caseId },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.getCaseOrFail(
      caseId,
      tenantId,
      await this.rbacService.getAuthContext(actor.userId, tenantId),
    );
  }

  async getKanban(
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<Record<OnboardingCaseStatus, OnboardingCaseEntity[]>> {
    await this.assertPeopleOps(actorId, tenantId);
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);

    const cases = await this.caseRepository.find({
      where: { tenantId },
      relations: ['tasks', 'tasks.templateTask', 'worker', 'template'],
      order: { updatedAt: 'DESC' },
    });

    const board: Record<OnboardingCaseStatus, OnboardingCaseEntity[]> = {
      [OnboardingCaseStatus.NOT_STARTED]: [],
      [OnboardingCaseStatus.IN_PROGRESS]: [],
      [OnboardingCaseStatus.BLOCKED]: [],
      [OnboardingCaseStatus.COMPLETE]: [],
    };

    for (const onboardingCase of cases) {
      board[onboardingCase.status].push(
        this.applyWorkerRedaction(onboardingCase, auth),
      );
    }

    return board;
  }

  /**
   * FLW-SEC-006 — Entra auto-provisioning via Microsoft Graph (stubbed).
   */
  async provisionEntraAccount(
    workerId: string,
    startDate?: string,
    actor?: ActorContext,
  ): Promise<void> {
    const date = startDate ?? new Date().toISOString().slice(0, 10);
    await this.entraProvisioningService.scheduleProvision(
      workerId,
      date,
      actor,
    );
  }

  /**
   * FLW-TAL-003 / FLW-SEC-006 — disable Entra account on last working day.
   */
  async disableEntraAccount(
    workerId: string,
    actor?: ActorContext,
  ): Promise<void> {
    await this.entraProvisioningService.disableAccount(workerId, actor);
  }

  /**
   * FLW-DOC-002 — auto-generate remaining document bundle on onboarding start.
   * Uses DocumentService when templates exist; otherwise stubs + audit.
   */
  async autoGenerateDocuments(
    workerId: string,
    caseId: string,
    actor: ActorContext,
  ): Promise<void> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    if (this.documentService) {
      try {
        const templates = await this.documentService.listTemplates(tenantId);
        if (templates.length > 0) {
          this.logger.debug(
            `Document templates available (${templates.length}) — selective auto-gen deferred to People Ops issue flow`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `DocumentService listTemplates failed: ${(err as Error).message}`,
        );
      }
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'onboarding.documents.auto_generate',
      entityType: 'onboarding_case',
      entityId: caseId,
      changes: {
        workerId: { old: null, new: workerId },
        stub: { old: null, new: true },
        note: {
          old: null,
          new: 'Auto-generate hook recorded; PDF render requires template selection',
        },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  private async getTemplateOrFail(
    id: string,
    tenantId: string,
  ): Promise<OnboardingTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
      relations: ['tasks'],
      order: { tasks: { sortOrder: 'ASC' } },
    });
    if (!template) {
      throw new NotFoundException({
        code: 'ONBOARDING_TEMPLATE_NOT_FOUND',
        message: 'Onboarding template not found',
      });
    }
    return template;
  }

  private async getCaseOrFail(
    id: string,
    tenantId: string,
    auth?: PolarisAuthContext,
  ): Promise<OnboardingCaseEntity> {
    const onboardingCase = await this.caseRepository.findOne({
      where: { id, tenantId },
      relations: ['tasks', 'tasks.templateTask', 'worker', 'template'],
      order: { tasks: { createdAt: 'ASC' } },
    });
    if (!onboardingCase) {
      throw new NotFoundException({
        code: 'ONBOARDING_CASE_NOT_FOUND',
        message: 'Onboarding case not found',
      });
    }
    if (!auth) {
      return onboardingCase;
    }
    return this.applyWorkerRedaction(onboardingCase, auth);
  }

  private applyWorkerRedaction(
    onboardingCase: OnboardingCaseEntity,
    auth: PolarisAuthContext,
  ): OnboardingCaseEntity {
    if (onboardingCase.worker) {
      onboardingCase.worker = redactNestedWorker(
        onboardingCase.worker,
        auth,
      ) as unknown as WorkerEntity;
    }
    return onboardingCase;
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
        code: 'ONBOARDING_ACCESS_DENIED',
        message: 'People Ops access required',
      });
    }
  }

  private async assertPeopleOpsOrManager(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const allowed = auth.roleCodes.some((code) =>
      [
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
        PolarisRoleCode.MANAGER,
        PolarisRoleCode.DIVISION_HEAD,
      ].includes(code as PolarisRoleCode),
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: 'ONBOARDING_ACCESS_DENIED',
        message: 'Insufficient role for onboarding access',
      });
    }
  }
}
