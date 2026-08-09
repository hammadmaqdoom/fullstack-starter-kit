import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ComplianceControlEntity } from './entities/compliance-control.entity';
import { ControlEvidenceLinkEntity } from './entities/control-evidence-link.entity';
import { ControlFrameworkMapEntity } from './entities/control-framework-map.entity';
import { ControlTestRunEntity } from './entities/control-test-run.entity';

export type ControlEvidenceStatus = {
  controlCode: string;
  title: string;
  domain: string;
  inScope: boolean;
  frameworks: { framework: string; externalRef: string }[];
  result: 'pass' | 'fail' | 'manual' | 'error' | 'skipped' | 'never_run';
  lastTestedAt: string | null;
  summary?: Record<string, unknown>;
  evidenceUrls: string[];
};

@Injectable()
export class ComplianceEvidenceService {
  constructor(
    @InjectRepository(ComplianceControlEntity)
    private readonly controlRepository: Repository<ComplianceControlEntity>,
    @InjectRepository(ControlFrameworkMapEntity)
    private readonly mapRepository: Repository<ControlFrameworkMapEntity>,
    @InjectRepository(ControlTestRunEntity)
    private readonly runRepository: Repository<ControlTestRunEntity>,
    @InjectRepository(ControlEvidenceLinkEntity)
    private readonly linkRepository: Repository<ControlEvidenceLinkEntity>,
  ) {}

  async status(tenantId: string): Promise<ControlEvidenceStatus[]> {
    const controls = await this.controlRepository.find({
      where: { tenantId, inScope: true },
      order: { sortOrder: 'ASC' },
    });
    return this.buildStatusRows(tenantId, controls);
  }

  async exportPack(
    tenantId: string,
    framework?: string,
  ): Promise<{
    tenantId: string;
    exportedAt: string;
    framework: string | null;
    controls: ControlEvidenceStatus[];
  }> {
    let controls = await this.controlRepository.find({
      where: { tenantId, inScope: true },
      order: { sortOrder: 'ASC' },
    });

    if (framework) {
      const maps = await this.mapRepository.find({
        where: { tenantId, framework },
      });
      const ids = new Set(maps.map((m) => m.controlId));
      controls = controls.filter((c) => ids.has(c.id));
    }

    const rows = await this.buildStatusRows(tenantId, controls);
    return {
      tenantId,
      exportedAt: new Date().toISOString(),
      framework: framework ?? null,
      controls: rows,
    };
  }

  private async buildStatusRows(
    tenantId: string,
    controls: ComplianceControlEntity[],
  ): Promise<ControlEvidenceStatus[]> {
    if (controls.length === 0) {
      return [];
    }
    const controlIds = controls.map((c) => c.id);
    const maps = await this.mapRepository.find({
      where: { tenantId, controlId: In(controlIds) },
    });
    const links = await this.linkRepository.find({
      where: { tenantId, controlId: In(controlIds) },
    });
    const runs = await this.runRepository
      .createQueryBuilder('run')
      .where('run.tenantId = :tenantId', { tenantId })
      .andWhere('run.controlId IN (:...controlIds)', { controlIds })
      .orderBy('run.ranAt', 'DESC')
      .getMany();

    const latest = new Map<string, ControlTestRunEntity>();
    for (const run of runs) {
      if (!latest.has(run.controlId)) {
        latest.set(run.controlId, run);
      }
    }

    return controls.map((control) => {
      const run = latest.get(control.id);
      const frameworks = maps
        .filter((m) => m.controlId === control.id)
        .map((m) => ({
          framework: m.framework,
          externalRef: m.externalRef,
        }));
      const evidenceUrls = [
        ...links
          .filter((l) => l.controlId === control.id)
          .map((l) => l.urlOrPath),
        ...(((run?.evidenceRefs as { path?: string }[]) ?? [])
          .map((r) => r.path)
          .filter(Boolean) as string[]),
      ];
      return {
        controlCode: control.code,
        title: control.title,
        domain: control.domain,
        inScope: control.inScope,
        frameworks,
        result: (run?.result as ControlEvidenceStatus['result']) ?? 'never_run',
        lastTestedAt: run?.ranAt?.toISOString() ?? null,
        summary: run?.summary,
        evidenceUrls,
      };
    });
  }
}
