import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  CreateLetterheadConfigDto,
  UpdateLegalEntityDocumentOutputDto,
} from './dto/letterhead-config.dto';
import { LetterheadConfigEntity } from './entities/letterhead-config.entity';

export interface DocumentActor {
  actorId: string;
  correlationId?: string;
  ipAddress?: string;
  tenantId?: string;
}

@Injectable()
export class LetterheadConfigService {
  constructor(
    @InjectRepository(LetterheadConfigEntity)
    private readonly letterheadRepository: Repository<LetterheadConfigEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    legalEntityId?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LetterheadConfigEntity[]> {
    return this.letterheadRepository.find({
      where: legalEntityId ? { tenantId, legalEntityId } : { tenantId },
      order: { legalEntityId: 'ASC', version: 'DESC' },
    });
  }

  /** Legal entities with their stamp/render-profile config — backs the letterhead admin screen. */
  async listLegalEntities(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LegalEntityEntity[]> {
    return this.legalEntityRepository.find({
      where: { tenantId },
      order: { code: 'ASC' },
    });
  }

  async findOne(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LetterheadConfigEntity> {
    const config = await this.letterheadRepository.findOne({
      where: { id, tenantId },
    });
    if (!config) {
      throw new NotFoundException({
        code: 'LETTERHEAD_CONFIG_NOT_FOUND',
        message: 'Letterhead config not found',
      });
    }
    return config;
  }

  async getCurrent(
    legalEntityId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LetterheadConfigEntity | null> {
    return this.letterheadRepository.findOne({
      where: { tenantId, legalEntityId, isCurrent: true },
    });
  }

  /** Creates a new letterhead version and promotes it to current. Prior issued PDFs keep their snapshot (PRD §6.8.1). */
  async create(
    dto: CreateLetterheadConfigDto,
    actor: DocumentActor,
  ): Promise<LetterheadConfigEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id: dto.legalEntityId, tenantId },
    });
    if (!legalEntity) {
      throw new NotFoundException({
        code: 'LEGAL_ENTITY_NOT_FOUND',
        message: 'Legal entity not found',
      });
    }

    const created = await this.dataSource.transaction(async (manager) => {
      const previousCurrent = await manager.findOne(LetterheadConfigEntity, {
        where: { tenantId, legalEntityId: dto.legalEntityId, isCurrent: true },
      });

      const latest = await manager.findOne(LetterheadConfigEntity, {
        where: { tenantId, legalEntityId: dto.legalEntityId },
        order: { version: 'DESC' },
        select: ['version'],
      });
      const nextVersion = (latest?.version ?? 0) + 1;
      const effectiveFrom = dto.effectiveFrom
        ? new Date(dto.effectiveFrom)
        : new Date();

      if (previousCurrent) {
        previousCurrent.isCurrent = false;
        previousCurrent.effectiveTo = effectiveFrom;
        await manager.save(LetterheadConfigEntity, previousCurrent);
      }

      const config = manager.create(LetterheadConfigEntity, {
        tenantId,
        legalEntityId: dto.legalEntityId,
        version: nextVersion,
        layoutJson: dto.layout,
        logoBlobUrl: dto.logoBlobUrl ?? null,
        previewBlobUrl: null,
        isCurrent: true,
        effectiveFrom,
        effectiveTo: null,
        createdBy: actor.actorId,
      });

      return manager.save(LetterheadConfigEntity, config);
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.actorId,
      action: 'letterhead_config.create',
      entityType: 'letterhead_config',
      entityId: created.id,
      changes: {
        legalEntityId: { old: null, new: dto.legalEntityId },
        version: { old: null, new: created.version },
        isCurrent: { old: null, new: true },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return created;
  }

  /** Stamp config + default render profile — People Ops surfaces alongside letterhead (PRD §6.8.1). */
  async updateDocumentOutput(
    legalEntityId: string,
    dto: UpdateLegalEntityDocumentOutputDto,
    actor: DocumentActor,
  ): Promise<LegalEntityEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id: legalEntityId, tenantId },
    });
    if (!legalEntity) {
      throw new NotFoundException({
        code: 'LEGAL_ENTITY_NOT_FOUND',
        message: 'Legal entity not found',
      });
    }

    const before = {
      requiresWetStamp: legalEntity.requiresWetStamp,
      stampInstructions: legalEntity.stampInstructions,
      defaultRenderProfile: legalEntity.defaultRenderProfile,
    };

    if (dto.requiresWetStamp !== undefined) {
      legalEntity.requiresWetStamp = dto.requiresWetStamp;
    }
    if (dto.stampInstructions !== undefined) {
      legalEntity.stampInstructions = dto.stampInstructions;
    }
    if (dto.defaultRenderProfile !== undefined) {
      legalEntity.defaultRenderProfile = dto.defaultRenderProfile;
    }

    const saved = await this.legalEntityRepository.save(legalEntity);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.actorId,
      action: 'legal_entity.document_output_update',
      entityType: 'legal_entity',
      entityId: saved.id,
      changes: {
        requiresWetStamp: {
          old: before.requiresWetStamp,
          new: saved.requiresWetStamp,
        },
        stampInstructions: {
          old: before.stampInstructions,
          new: saved.stampInstructions,
        },
        defaultRenderProfile: {
          old: before.defaultRenderProfile,
          new: saved.defaultRenderProfile,
        },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }
}
