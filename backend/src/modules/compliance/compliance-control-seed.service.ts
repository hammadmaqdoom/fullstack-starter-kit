import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SEED_CONTROLS } from './constants/compliance-controls.seed';
import { ComplianceControlEntity } from './entities/compliance-control.entity';
import { ComplianceProgrammeEntity } from './entities/compliance-programme.entity';
import { ControlFrameworkMapEntity } from './entities/control-framework-map.entity';

@Injectable()
export class ComplianceControlSeedService {
  constructor(
    @InjectRepository(ComplianceProgrammeEntity)
    private readonly programmeRepository: Repository<ComplianceProgrammeEntity>,
    @InjectRepository(ComplianceControlEntity)
    private readonly controlRepository: Repository<ComplianceControlEntity>,
    @InjectRepository(ControlFrameworkMapEntity)
    private readonly mapRepository: Repository<ControlFrameworkMapEntity>,
  ) {}

  /**
   * Idempotent per-tenant seed. Safe to call on migrate and on tenant provision.
   */
  async ensureSeeded(tenantId: string): Promise<void> {
    let programme = await this.programmeRepository.findOne({
      where: { tenantId },
    });
    if (!programme) {
      programme = this.programmeRepository.create({
        tenantId,
        evidenceWindowStart: null,
        targetFrameworks: ['ISO27001', 'ISO27701', 'SOC2'],
        nextAuditTargetDate: null,
        notes: null,
      });
      await this.programmeRepository.save(programme);
    }

    for (const seed of SEED_CONTROLS) {
      let control = await this.controlRepository.findOne({
        where: { tenantId, code: seed.code },
      });
      if (!control) {
        control = this.controlRepository.create({
          tenantId,
          code: seed.code,
          title: seed.title,
          description: seed.description,
          domain: seed.domain,
          ownerRole: seed.ownerRole,
          frequency: seed.frequency,
          inScope: seed.inScope,
          testAdapterKey: seed.testAdapterKey,
          sortOrder: seed.sortOrder,
        });
        control = await this.controlRepository.save(control);
      }

      for (const map of seed.maps) {
        const existing = await this.mapRepository.findOne({
          where: {
            tenantId,
            controlId: control.id,
            framework: map.framework,
            externalRef: map.externalRef,
          },
        });
        if (!existing) {
          await this.mapRepository.save(
            this.mapRepository.create({
              tenantId,
              controlId: control.id,
              framework: map.framework,
              externalRef: map.externalRef,
              notes: null,
            }),
          );
        }
      }
    }
  }
}
