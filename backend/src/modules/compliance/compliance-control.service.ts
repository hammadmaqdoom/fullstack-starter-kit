import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { ControlTestRunnerService } from './control-test-runner.service';
import {
  CreateControlEvidenceLinkDto,
  QueryControlsDto,
  UpdateComplianceProgrammeDto,
} from './dto/compliance-control.dto';
import { ComplianceControlEntity } from './entities/compliance-control.entity';
import { ComplianceProgrammeEntity } from './entities/compliance-programme.entity';
import { ControlEvidenceLinkEntity } from './entities/control-evidence-link.entity';
import { ControlFrameworkMapEntity } from './entities/control-framework-map.entity';
import { ControlTestRunEntity } from './entities/control-test-run.entity';
import { ControlTestTrigger } from './enums/control.enum';

@Injectable()
export class ComplianceControlService {
  constructor(
    @InjectRepository(ComplianceProgrammeEntity)
    private readonly programmeRepository: Repository<ComplianceProgrammeEntity>,
    @InjectRepository(ComplianceControlEntity)
    private readonly controlRepository: Repository<ComplianceControlEntity>,
    @InjectRepository(ControlFrameworkMapEntity)
    private readonly mapRepository: Repository<ControlFrameworkMapEntity>,
    @InjectRepository(ControlTestRunEntity)
    private readonly runRepository: Repository<ControlTestRunEntity>,
    @InjectRepository(ControlEvidenceLinkEntity)
    private readonly linkRepository: Repository<ControlEvidenceLinkEntity>,
    private readonly runner: ControlTestRunnerService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getProgramme(tenantId: string): Promise<ComplianceProgrammeEntity> {
    const programme = await this.programmeRepository.findOne({
      where: { tenantId },
    });
    if (!programme) {
      throw new NotFoundException('Compliance programme not found for tenant');
    }
    return programme;
  }

  async updateProgramme(
    tenantId: string,
    dto: UpdateComplianceProgrammeDto,
    actorId: string,
  ): Promise<ComplianceProgrammeEntity> {
    const programme = await this.getProgramme(tenantId);
    if (dto.evidenceWindowStart !== undefined) {
      programme.evidenceWindowStart = dto.evidenceWindowStart;
    }
    if (dto.targetFrameworks !== undefined) {
      programme.targetFrameworks = dto.targetFrameworks;
    }
    if (dto.nextAuditTargetDate !== undefined) {
      programme.nextAuditTargetDate = dto.nextAuditTargetDate;
    }
    if (dto.notes !== undefined) {
      programme.notes = dto.notes;
    }
    const saved = await this.programmeRepository.save(programme);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'compliance.programme.update',
      entityType: 'compliance_programme',
      entityId: saved.id,
      changes: {
        evidenceWindowStart: {
          old: null,
          new: dto.evidenceWindowStart ?? null,
        },
        targetFrameworks: {
          old: null,
          new: dto.targetFrameworks ?? null,
        },
        nextAuditTargetDate: {
          old: null,
          new: dto.nextAuditTargetDate ?? null,
        },
      },
    });
    return saved;
  }

  async listControls(tenantId: string, query: QueryControlsDto) {
    const qb = this.controlRepository
      .createQueryBuilder('control')
      .where('control.tenantId = :tenantId', { tenantId })
      .orderBy('control.sortOrder', 'ASC');

    if (query.domain) {
      qb.andWhere('control.domain = :domain', { domain: query.domain });
    }
    if (query.inScope === 'true' || query.inScope === 'false') {
      qb.andWhere('control.inScope = :inScope', {
        inScope: query.inScope === 'true',
      });
    }

    const controls = await qb.getMany();
    const latestByControl = await this.latestRunsByControlIds(
      tenantId,
      controls.map((c) => c.id),
    );
    const maps = await this.mapRepository.find({
      where: { tenantId, controlId: In(controls.map((c) => c.id)) },
    });
    const mapsByControl = new Map<string, ControlFrameworkMapEntity[]>();
    for (const map of maps) {
      const list = mapsByControl.get(map.controlId) ?? [];
      list.push(map);
      mapsByControl.set(map.controlId, list);
    }

    let rows = controls.map((control) => {
      const latest = latestByControl.get(control.id) ?? null;
      return {
        ...control,
        latestRun: latest,
        frameworks: (mapsByControl.get(control.id) ?? []).map((m) => ({
          framework: m.framework,
          externalRef: m.externalRef,
        })),
      };
    });

    if (query.result) {
      rows = rows.filter((row) => {
        const result = row.latestRun?.result ?? 'never_run';
        return result === query.result;
      });
    }

    return rows;
  }

  async getControl(tenantId: string, code: string) {
    const control = await this.controlRepository.findOne({
      where: { tenantId, code },
    });
    if (!control) {
      throw new NotFoundException(`Control ${code} not found`);
    }
    const frameworks = await this.mapRepository.find({
      where: { tenantId, controlId: control.id },
    });
    const runs = await this.runRepository.find({
      where: { tenantId, controlId: control.id },
      order: { ranAt: 'DESC' },
      take: 20,
    });
    const links = await this.linkRepository.find({
      where: { tenantId, controlId: control.id },
      order: { collectedAt: 'DESC' },
    });
    return { ...control, frameworks, runs, evidenceLinks: links };
  }

  async listRuns(tenantId: string, code: string, page = 1, limit = 20) {
    const control = await this.controlRepository.findOne({
      where: { tenantId, code },
    });
    if (!control) {
      throw new NotFoundException(`Control ${code} not found`);
    }
    const [items, total] = await this.runRepository.findAndCount({
      where: { tenantId, controlId: control.id },
      order: { ranAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async runControl(tenantId: string, code: string, actorId: string) {
    return this.runner.runOne(
      code,
      tenantId,
      ControlTestTrigger.MANUAL,
      actorId,
    );
  }

  async runAll(tenantId: string, actorId: string) {
    return this.runner.runAll(tenantId, ControlTestTrigger.API, actorId);
  }

  async addEvidenceLink(
    tenantId: string,
    code: string,
    dto: CreateControlEvidenceLinkDto,
    actorId: string,
  ) {
    const control = await this.controlRepository.findOne({
      where: { tenantId, code },
    });
    if (!control) {
      throw new NotFoundException(`Control ${code} not found`);
    }
    const link = await this.linkRepository.save(
      this.linkRepository.create({
        tenantId,
        controlId: control.id,
        label: dto.label,
        urlOrPath: dto.urlOrPath,
        collectedAt: new Date(),
        collectedBy: actorId,
      }),
    );
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'compliance.control.evidence_link',
      entityType: 'compliance_control',
      entityId: control.id,
      changes: {
        linkId: { old: null, new: link.id },
        label: { old: null, new: dto.label },
      },
    });
    return link;
  }

  private async latestRunsByControlIds(
    tenantId: string,
    controlIds: string[],
  ): Promise<Map<string, ControlTestRunEntity>> {
    const map = new Map<string, ControlTestRunEntity>();
    if (controlIds.length === 0) {
      return map;
    }
    const runs = await this.runRepository
      .createQueryBuilder('run')
      .where('run.tenantId = :tenantId', { tenantId })
      .andWhere('run.controlId IN (:...controlIds)', { controlIds })
      .orderBy('run.ranAt', 'DESC')
      .getMany();
    for (const run of runs) {
      if (!map.has(run.controlId)) {
        map.set(run.controlId, run);
      }
    }
    return map;
  }
}
