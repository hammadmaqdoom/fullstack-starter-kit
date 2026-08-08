import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  CreatePolicyDto,
  CreatePolicyVersionDto,
  PublishPolicyDto,
} from './dto/policy.dto';
import { PolicyAcknowledgementEntity } from './entities/policy-acknowledgement.entity';
import { PolicyPopulationRuleEntity } from './entities/policy-population-rule.entity';
import { PolicyVersionEntity } from './entities/policy-version.entity';
import { PolicyEntity } from './entities/policy.entity';
import { PolicyVersionStatus } from './enums/policy.enum';

export interface PendingAcknowledgementItem {
  policyId: string;
  policyCode: string;
  policyTitle: string;
  category: string;
  policyVersionId: string;
  version: number;
  effectiveFrom: string;
  contentHtml: string | null;
  blobUrl: string | null;
}

export interface ComplianceDashboardRow {
  policyId: string;
  policyCode: string;
  policyTitle: string;
  policyVersionId: string;
  version: number;
  populationCount: number;
  acknowledgedCount: number;
  pendingCount: number;
}

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(PolicyEntity)
    private readonly policyRepository: Repository<PolicyEntity>,
    @InjectRepository(PolicyVersionEntity)
    private readonly versionRepository: Repository<PolicyVersionEntity>,
    @InjectRepository(PolicyPopulationRuleEntity)
    private readonly ruleRepository: Repository<PolicyPopulationRuleEntity>,
    @InjectRepository(PolicyAcknowledgementEntity)
    private readonly acknowledgementRepository: Repository<PolicyAcknowledgementEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async list(tenantId: string = DIGITARO_TENANT_ID): Promise<PolicyEntity[]> {
    return this.policyRepository.find({
      where: { tenantId },
      relations: ['populationRules', 'versions'],
      order: { code: 'ASC' },
    });
  }

  async create(
    dto: CreatePolicyDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PolicyEntity> {
    const existing = await this.policyRepository.findOne({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException({
        code: 'POLICY_CODE_EXISTS',
        message: `Policy code ${dto.code} already exists`,
      });
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const policy = await manager.save(
        PolicyEntity,
        manager.create(PolicyEntity, {
          tenantId,
          code: dto.code,
          title: dto.title,
          category: dto.category,
          isActive: dto.isActive ?? true,
        }),
      );

      if (dto.populationRules?.length) {
        await manager.save(
          PolicyPopulationRuleEntity,
          dto.populationRules.map((rule) =>
            manager.create(PolicyPopulationRuleEntity, {
              tenantId,
              policyId: policy.id,
              countryCode: rule.countryCode ?? null,
              divisionId: rule.divisionId ?? null,
              employmentTypeId: rule.employmentTypeId ?? null,
            }),
          ),
        );
      }

      return policy;
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'policy.create',
      entityType: 'policy',
      entityId: saved.id,
      changes: {
        code: { old: null, new: saved.code },
        title: { old: null, new: saved.title },
        category: { old: null, new: saved.category },
      },
      correlationId,
      ipAddress,
    });

    return this.findPolicyOrFail(saved.id, tenantId);
  }

  async createVersion(
    policyId: string,
    dto: CreatePolicyVersionDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PolicyVersionEntity> {
    await this.findPolicyOrFail(policyId, tenantId);
    this.assertContentPresent(dto.contentHtml, dto.blobUrl);

    const nextVersion = await this.nextVersionNumber(policyId, tenantId);
    const version = await this.versionRepository.save(
      this.versionRepository.create({
        tenantId,
        policyId,
        version: nextVersion,
        contentHtml: dto.contentHtml ?? null,
        blobUrl: dto.blobUrl ?? null,
        effectiveFrom: dto.effectiveFrom,
        status: PolicyVersionStatus.DRAFT,
        publishedAt: null,
        publishedBy: null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'policy.version_create',
      entityType: 'policy_version',
      entityId: version.id,
      changes: {
        policyId: { old: null, new: policyId },
        version: { old: null, new: version.version },
        status: { old: null, new: version.status },
      },
      correlationId,
      ipAddress,
    });

    return version;
  }

  async publish(
    policyId: string,
    dto: PublishPolicyDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PolicyVersionEntity> {
    await this.findPolicyOrFail(policyId, tenantId);

    const published = await this.dataSource.transaction(async (manager) => {
      let source: PolicyVersionEntity | null = null;

      if (dto.versionId) {
        source = await manager.findOne(PolicyVersionEntity, {
          where: { id: dto.versionId, policyId, tenantId },
        });
        if (!source) {
          throw new NotFoundException({
            code: 'POLICY_VERSION_NOT_FOUND',
            message: 'Policy version not found',
          });
        }
        if (source.status !== PolicyVersionStatus.DRAFT) {
          throw new BadRequestException({
            code: 'POLICY_VERSION_NOT_DRAFT',
            message: 'Only draft versions can be published',
          });
        }
      } else if (dto.contentHtml || dto.blobUrl) {
        this.assertContentPresent(dto.contentHtml, dto.blobUrl);
        const nextVersion = await this.nextVersionNumber(
          policyId,
          tenantId,
          manager.getRepository(PolicyVersionEntity),
        );
        source = await manager.save(
          PolicyVersionEntity,
          manager.create(PolicyVersionEntity, {
            tenantId,
            policyId,
            version: nextVersion,
            contentHtml: dto.contentHtml ?? null,
            blobUrl: dto.blobUrl ?? null,
            effectiveFrom:
              dto.effectiveFrom ?? new Date().toISOString().slice(0, 10),
            status: PolicyVersionStatus.DRAFT,
            publishedAt: null,
            publishedBy: null,
          }),
        );
      } else {
        source = await manager.findOne(PolicyVersionEntity, {
          where: {
            tenantId,
            policyId,
            status: PolicyVersionStatus.DRAFT,
          },
          order: { version: 'DESC' },
        });
        if (!source) {
          throw new BadRequestException({
            code: 'POLICY_NO_DRAFT',
            message: 'No draft version available to publish',
          });
        }
      }

      await manager.update(
        PolicyVersionEntity,
        {
          tenantId,
          policyId,
          status: PolicyVersionStatus.PUBLISHED,
        },
        { status: PolicyVersionStatus.ARCHIVED },
      );

      source.status = PolicyVersionStatus.PUBLISHED;
      source.publishedAt = new Date();
      source.publishedBy = actorId;
      if (dto.effectiveFrom) {
        source.effectiveFrom = dto.effectiveFrom;
      }

      return manager.save(PolicyVersionEntity, source);
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'policy.publish',
      entityType: 'policy_version',
      entityId: published.id,
      changes: {
        policyId: { old: null, new: policyId },
        version: { old: null, new: published.version },
        status: { old: PolicyVersionStatus.DRAFT, new: published.status },
        effectiveFrom: { old: null, new: published.effectiveFrom },
      },
      correlationId,
      ipAddress,
    });

    return published;
  }

  async getPendingAcknowledgements(
    userId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PendingAcknowledgementItem[]> {
    const worker = await this.requireActingWorker(userId, tenantId);
    const applicable = await this.findApplicablePublishedVersions(
      worker,
      tenantId,
    );

    if (applicable.length === 0) {
      return [];
    }

    const acks = await this.acknowledgementRepository.find({
      where: {
        tenantId,
        workerId: worker.id,
        policyVersionId: In(applicable.map((v) => v.id)),
      },
      select: ['policyVersionId'],
    });
    const ackSet = new Set(acks.map((a) => a.policyVersionId));

    return applicable
      .filter((version) => !ackSet.has(version.id))
      .map((version) => ({
        policyId: version.policyId,
        policyCode: version.policy!.code,
        policyTitle: version.policy!.title,
        category: version.policy!.category,
        policyVersionId: version.id,
        version: version.version,
        effectiveFrom: version.effectiveFrom,
        contentHtml: version.contentHtml,
        blobUrl: version.blobUrl,
      }));
  }

  async acknowledge(
    policyVersionId: string,
    userId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PolicyAcknowledgementEntity> {
    const worker = await this.requireActingWorker(userId, tenantId);
    const version = await this.versionRepository.findOne({
      where: { id: policyVersionId, tenantId },
      relations: ['policy', 'policy.populationRules'],
    });

    if (!version || !version.policy) {
      throw new NotFoundException({
        code: 'POLICY_VERSION_NOT_FOUND',
        message: 'Policy version not found',
      });
    }

    if (version.status !== PolicyVersionStatus.PUBLISHED) {
      throw new BadRequestException({
        code: 'POLICY_VERSION_NOT_PUBLISHED',
        message: 'Only published policy versions can be acknowledged',
      });
    }

    if (!version.policy.isActive) {
      throw new BadRequestException({
        code: 'POLICY_INACTIVE',
        message: 'Policy is inactive',
      });
    }

    if (
      !this.workerMatchesPopulation(
        worker,
        version.policy.populationRules ?? [],
      )
    ) {
      throw new BadRequestException({
        code: 'POLICY_NOT_APPLICABLE',
        message: 'Policy does not apply to this worker',
      });
    }

    const existing = await this.acknowledgementRepository.findOne({
      where: {
        tenantId,
        workerId: worker.id,
        policyVersionId,
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'POLICY_ALREADY_ACKNOWLEDGED',
        message: 'Policy version already acknowledged',
      });
    }

    const acknowledgement = await this.acknowledgementRepository.save(
      this.acknowledgementRepository.create({
        tenantId,
        workerId: worker.id,
        policyVersionId,
        acknowledgedAt: new Date(),
        ipAddress: ipAddress ?? null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: userId,
      action: 'policy.acknowledge',
      entityType: 'policy_acknowledgement',
      entityId: acknowledgement.id,
      changes: {
        workerId: { old: null, new: worker.id },
        policyVersionId: { old: null, new: policyVersionId },
        policyId: { old: null, new: version.policyId },
        version: { old: null, new: version.version },
      },
      correlationId,
      ipAddress,
    });

    return acknowledgement;
  }

  async getComplianceDashboard(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ComplianceDashboardRow[]> {
    const published = await this.versionRepository.find({
      where: {
        tenantId,
        status: PolicyVersionStatus.PUBLISHED,
        policy: { isActive: true },
      },
      relations: ['policy', 'policy.populationRules'],
    });

    const workers = await this.workerRepository.find({
      where: { tenantId },
      select: ['id', 'countryCode', 'divisionId', 'employmentTypeId'],
    });

    const rows: ComplianceDashboardRow[] = [];

    for (const version of published) {
      if (!version.policy) {
        continue;
      }

      const population = workers.filter((worker) =>
        this.workerMatchesPopulation(
          worker,
          version.policy!.populationRules ?? [],
        ),
      );
      const populationIds = population.map((w) => w.id);

      let acknowledgedCount = 0;
      if (populationIds.length > 0) {
        acknowledgedCount = await this.acknowledgementRepository.count({
          where: {
            tenantId,
            policyVersionId: version.id,
            workerId: In(populationIds),
          },
        });
      }

      rows.push({
        policyId: version.policyId,
        policyCode: version.policy.code,
        policyTitle: version.policy.title,
        policyVersionId: version.id,
        version: version.version,
        populationCount: population.length,
        acknowledgedCount,
        pendingCount: population.length - acknowledgedCount,
      });
    }

    return rows.sort((a, b) => a.policyCode.localeCompare(b.policyCode));
  }

  /** Exposed for unit tests — population rule matching. */
  workerMatchesPopulation(
    worker: Pick<
      WorkerEntity,
      'countryCode' | 'divisionId' | 'employmentTypeId'
    >,
    rules: PolicyPopulationRuleEntity[],
  ): boolean {
    if (rules.length === 0) {
      return true;
    }

    return rules.some(
      (rule) =>
        (rule.countryCode === null ||
          rule.countryCode === worker.countryCode) &&
        (rule.divisionId === null || rule.divisionId === worker.divisionId) &&
        (rule.employmentTypeId === null ||
          rule.employmentTypeId === worker.employmentTypeId),
    );
  }

  private async findApplicablePublishedVersions(
    worker: WorkerEntity,
    tenantId: string,
  ): Promise<PolicyVersionEntity[]> {
    const published = await this.versionRepository.find({
      where: {
        tenantId,
        status: PolicyVersionStatus.PUBLISHED,
        policy: { isActive: true, tenantId },
      },
      relations: ['policy', 'policy.populationRules'],
      order: { version: 'DESC' },
    });

    return published.filter(
      (version) =>
        version.policy &&
        this.workerMatchesPopulation(
          worker,
          version.policy.populationRules ?? [],
        ),
    );
  }

  private async requireActingWorker(
    userId: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const workerId = await resolveActingWorkerId(
      this.workerRepository,
      userId,
      tenantId,
    );
    if (!workerId) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'No worker profile linked to current user',
      });
    }

    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    return worker;
  }

  private async findPolicyOrFail(
    policyId: string,
    tenantId: string,
  ): Promise<PolicyEntity> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId, tenantId },
      relations: ['populationRules', 'versions'],
    });
    if (!policy) {
      throw new NotFoundException({
        code: 'POLICY_NOT_FOUND',
        message: 'Policy not found',
      });
    }
    return policy;
  }

  private async nextVersionNumber(
    policyId: string,
    tenantId: string,
    repo: Repository<PolicyVersionEntity> = this.versionRepository,
  ): Promise<number> {
    const latest = await repo.findOne({
      where: { policyId, tenantId },
      order: { version: 'DESC' },
      select: ['version'],
    });
    return (latest?.version ?? 0) + 1;
  }

  private assertContentPresent(
    contentHtml?: string | null,
    blobUrl?: string | null,
  ): void {
    if (!contentHtml && !blobUrl) {
      throw new BadRequestException({
        code: 'POLICY_CONTENT_REQUIRED',
        message: 'Either contentHtml or blobUrl is required',
      });
    }
  }
}
