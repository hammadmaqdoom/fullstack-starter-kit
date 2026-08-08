import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DocumentTemplateVersionEntity } from '@/modules/country-config/entities/document-template-version.entity';
import { DocumentTemplateEntity } from '@/modules/country-config/entities/document-template.entity';
import { DocumentTemplateVersionStatus } from '@/modules/country-config/enums/setup-wizard.enum';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentBlobStorageService } from './document-blob-storage.service';
import { DocumentNumberService } from './document-number.service';
import { DocumentPdfService } from './document-pdf.service';
import {
  CreateDocumentTemplateDto,
  CreateDocumentTemplateVersionDto,
  GenerateDocumentDto,
  PublishDocumentTemplateVersionDto,
  QueryDocumentRegisterDto,
  UpdateDocumentTemplateDto,
} from './dto/document.dto';
import { GeneratedDocumentEntity } from './entities/generated-document.entity';
import { LetterheadConfigEntity } from './entities/letterhead-config.entity';
import { GeneratedDocumentStatus, RenderProfile } from './enums/document.enum';

const MERGE_FIELD_TOKEN_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export interface DocumentRegisterResult {
  items: GeneratedDocumentEntity[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ExportDocumentResult {
  documentId: string;
  renderProfile: RenderProfile;
  blobUrl: string;
}

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentTemplateEntity)
    private readonly templateRepository: Repository<DocumentTemplateEntity>,
    @InjectRepository(DocumentTemplateVersionEntity)
    private readonly templateVersionRepository: Repository<DocumentTemplateVersionEntity>,
    @InjectRepository(GeneratedDocumentEntity)
    private readonly generatedDocumentRepository: Repository<GeneratedDocumentEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    @InjectRepository(LetterheadConfigEntity)
    private readonly letterheadRepository: Repository<LetterheadConfigEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
    private readonly documentNumberService: DocumentNumberService,
    private readonly documentPdfService: DocumentPdfService,
    private readonly blobStorageService: DocumentBlobStorageService,
  ) {}

  async listTemplates(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentTemplateEntity[]> {
    return this.templateRepository.find({
      where: { tenantId },
      relations: ['versions'],
      order: { code: 'ASC' },
    });
  }

  async getTemplate(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentTemplateEntity> {
    return this.findTemplateOrFail(id, tenantId);
  }

  async listVersions(
    templateId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentTemplateVersionEntity[]> {
    await this.findTemplateOrFail(templateId, tenantId);
    return this.templateVersionRepository.find({
      where: { tenantId, templateId },
      order: { version: 'DESC' },
    });
  }

  async createTemplate(
    dto: CreateDocumentTemplateDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentTemplateEntity> {
    const existing = await this.templateRepository.findOne({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException({
        code: 'DOCUMENT_TEMPLATE_CODE_EXISTS',
        message: `Template code ${dto.code} already exists`,
      });
    }

    const saved = await this.templateRepository.save(
      this.templateRepository.create({
        tenantId,
        code: dto.code,
        name: dto.name ?? dto.code,
        documentType: dto.documentType,
        audience: dto.audience,
        countryCode: dto.countryCode ?? null,
        employmentTypeId: dto.employmentTypeId ?? null,
        divisionId: dto.divisionId ?? null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'document_template.create',
      entityType: 'document_template',
      entityId: saved.id,
      changes: {
        code: { old: null, new: saved.code },
        name: { old: null, new: saved.name },
        documentType: { old: null, new: saved.documentType },
      },
      correlationId,
      ipAddress,
    });

    return this.findTemplateOrFail(saved.id, tenantId);
  }

  async updateTemplate(
    id: string,
    dto: UpdateDocumentTemplateDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentTemplateEntity> {
    const template = await this.findTemplateOrFail(id, tenantId);
    const before = {
      name: template.name,
      status: template.status,
      countryCode: template.countryCode,
    };

    if (dto.name !== undefined) {
      template.name = dto.name;
    }
    if (dto.status !== undefined) {
      template.status = dto.status;
    }
    if (dto.countryCode !== undefined) {
      template.countryCode = dto.countryCode;
    }
    if (dto.employmentTypeId !== undefined) {
      template.employmentTypeId = dto.employmentTypeId;
    }
    if (dto.divisionId !== undefined) {
      template.divisionId = dto.divisionId;
    }

    await this.templateRepository.save(template);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'document_template.update',
      entityType: 'document_template',
      entityId: template.id,
      changes: {
        name: { old: before.name, new: template.name },
        status: { old: before.status, new: template.status },
        countryCode: { old: before.countryCode, new: template.countryCode },
      },
      correlationId,
      ipAddress,
    });

    return this.findTemplateOrFail(id, tenantId);
  }

  async createVersion(
    templateId: string,
    dto: CreateDocumentTemplateVersionDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentTemplateVersionEntity> {
    await this.findTemplateOrFail(templateId, tenantId);
    const mergeFieldSchema = dto.mergeFieldSchema ?? {};
    this.assertBodyTokensResolvable(dto.body, mergeFieldSchema);

    const nextVersion = await this.nextVersionNumber(templateId, tenantId);
    const version = await this.templateVersionRepository.save(
      this.templateVersionRepository.create({
        tenantId,
        templateId,
        version: nextVersion,
        body: dto.body,
        mergeFieldSchema,
        status: DocumentTemplateVersionStatus.DRAFT,
        publishedAt: null,
        publishedBy: null,
        createdBy: actorId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'document_template.version_create',
      entityType: 'document_template_version',
      entityId: version.id,
      changes: {
        templateId: { old: null, new: templateId },
        version: { old: null, new: version.version },
        status: { old: null, new: version.status },
      },
      correlationId,
      ipAddress,
    });

    return version;
  }

  async publishVersion(
    templateId: string,
    dto: PublishDocumentTemplateVersionDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentTemplateVersionEntity> {
    await this.findTemplateOrFail(templateId, tenantId);

    const published = await this.dataSource.transaction(async (manager) => {
      let source: DocumentTemplateVersionEntity | null = null;

      if (dto.versionId) {
        source = await manager.findOne(DocumentTemplateVersionEntity, {
          where: { id: dto.versionId, templateId, tenantId },
        });
        if (!source) {
          throw new NotFoundException({
            code: 'DOCUMENT_TEMPLATE_VERSION_NOT_FOUND',
            message: 'Document template version not found',
          });
        }
        if (source.status !== DocumentTemplateVersionStatus.DRAFT) {
          throw new BadRequestException({
            code: 'DOCUMENT_TEMPLATE_VERSION_NOT_DRAFT',
            message: 'Only draft versions can be published',
          });
        }
      } else {
        source = await manager.findOne(DocumentTemplateVersionEntity, {
          where: {
            tenantId,
            templateId,
            status: DocumentTemplateVersionStatus.DRAFT,
          },
          order: { version: 'DESC' },
        });
        if (!source) {
          throw new BadRequestException({
            code: 'DOCUMENT_TEMPLATE_NO_DRAFT',
            message: 'No draft version available to publish',
          });
        }
      }

      await manager.update(
        DocumentTemplateVersionEntity,
        {
          tenantId,
          templateId,
          status: DocumentTemplateVersionStatus.PUBLISHED,
        },
        { status: DocumentTemplateVersionStatus.ARCHIVED },
      );

      source.status = DocumentTemplateVersionStatus.PUBLISHED;
      source.publishedAt = new Date();
      source.publishedBy = actorId;

      return manager.save(DocumentTemplateVersionEntity, source);
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'document_template.publish',
      entityType: 'document_template_version',
      entityId: published.id,
      changes: {
        templateId: { old: null, new: templateId },
        version: { old: null, new: published.version },
        status: {
          old: DocumentTemplateVersionStatus.DRAFT,
          new: published.status,
        },
      },
      correlationId,
      ipAddress,
    });

    return published;
  }

  async generate(
    dto: GenerateDocumentDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<GeneratedDocumentEntity> {
    const templateVersion = await this.templateVersionRepository.findOne({
      where: { id: dto.templateVersionId, tenantId },
      relations: ['template'],
    });
    if (!templateVersion) {
      throw new NotFoundException({
        code: 'TEMPLATE_VERSION_NOT_FOUND',
        message: 'Document template version not found',
      });
    }

    const worker = await this.workerRepository.findOne({
      where: { id: dto.workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    this.validateMergeFields(
      templateVersion.mergeFieldSchema ?? {},
      dto.mergeData ?? {},
    );

    const generated = await this.generatedDocumentRepository.save(
      this.generatedDocumentRepository.create({
        tenantId,
        workerId: dto.workerId,
        templateVersionId: dto.templateVersionId,
        status: GeneratedDocumentStatus.DRAFT,
        blobUrl: null,
        mergeData: dto.mergeData,
        templateSnapshot: {
          templateId: templateVersion.templateId,
          version: templateVersion.version,
          body: templateVersion.body,
          mergeFieldSchema: templateVersion.mergeFieldSchema,
        },
        legalEntityId: dto.legalEntityId ?? worker.legalEntityId,
        issuedBy: null,
        issuedAt: null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'document.generate',
      entityType: 'generated_document',
      entityId: generated.id,
      changes: {
        workerId: { old: null, new: dto.workerId },
        templateVersionId: { old: null, new: dto.templateVersionId },
        status: { old: null, new: generated.status },
      },
      correlationId,
      ipAddress,
    });

    return generated;
  }

  async getGeneratedDocument(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<GeneratedDocumentEntity> {
    return this.findGeneratedDocumentOrFail(id, tenantId);
  }

  /**
   * Draft → Issue (PRD §6.8.3/§6.8.4): assigns the immutable `document_number`,
   * snapshots the current letterhead version, stores the canonical `full_digital`
   * PDF, and records `issued_at` / `issued_by`. Never re-issuable once issued.
   */
  async issue(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<GeneratedDocumentEntity> {
    const document = await this.findGeneratedDocumentOrFail(id, tenantId);

    if (document.status !== GeneratedDocumentStatus.DRAFT) {
      throw new BadRequestException({
        code: 'DOCUMENT_ALREADY_ISSUED',
        message:
          'Only draft documents can be issued; document numbers are never reassigned',
      });
    }
    if (!document.legalEntityId) {
      throw new BadRequestException({
        code: 'DOCUMENT_LEGAL_ENTITY_UNRESOLVED',
        message: 'Cannot issue a document with no resolved legal entity',
      });
    }

    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id: document.legalEntityId, tenantId },
    });
    if (!legalEntity) {
      throw new NotFoundException({
        code: 'LEGAL_ENTITY_NOT_FOUND',
        message: 'Legal entity not found',
      });
    }

    const templateVersion = await this.templateVersionRepository.findOne({
      where: { id: document.templateVersionId, tenantId },
      relations: ['template'],
    });
    if (!templateVersion?.template) {
      throw new NotFoundException({
        code: 'TEMPLATE_VERSION_NOT_FOUND',
        message: 'Document template version not found',
      });
    }

    // Defensive re-check — merge data / schema must still resolve at issue time (FLW-DOC-002 step 2).
    this.validateMergeFields(
      templateVersion.mergeFieldSchema ?? {},
      document.mergeData ?? {},
    );

    const issuedAt = new Date();
    const currentLetterhead = await this.letterheadRepository.findOne({
      where: { tenantId, legalEntityId: legalEntity.id, isCurrent: true },
    });

    const issued = await this.dataSource.transaction(async (manager) => {
      const documentNumber = await this.documentNumberService.next(manager, {
        tenantId,
        legalEntityId: legalEntity.id,
        legalEntityCode: legalEntity.code,
        documentType: templateVersion.template!.documentType,
        issuedAt,
      });

      document.documentNumber = documentNumber;
      document.letterheadConfigId = currentLetterhead?.id ?? null;
      document.issuedAt = issuedAt;
      document.issuedBy = actorId;
      document.status = GeneratedDocumentStatus.ISSUED;

      return manager.save(GeneratedDocumentEntity, document);
    });

    const pdf = await this.documentPdfService.render(
      issued,
      RenderProfile.FULL_DIGITAL,
    );
    issued.blobUrl = await this.blobStorageService.upload(
      pdf,
      'documents/issued',
      `${issued.id}-${issued.documentNumber}.pdf`,
    );
    await this.generatedDocumentRepository.save(issued);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'document.issue',
      entityType: 'generated_document',
      entityId: issued.id,
      changes: {
        status: { old: GeneratedDocumentStatus.DRAFT, new: issued.status },
        documentNumber: { old: null, new: issued.documentNumber },
        letterheadConfigId: { old: null, new: issued.letterheadConfigId },
      },
      correlationId,
      ipAddress,
    });

    return issued;
  }

  /**
   * Export/print at a chosen render profile (PRD §6.8.5). Never creates a new
   * `GeneratedDocument` row — the issued `full_digital` PDF is canonical and
   * reused as-is; other profiles are rendered on demand from the same snapshot.
   */
  async exportDocument(
    id: string,
    renderProfile: RenderProfile,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExportDocumentResult> {
    const document = await this.findGeneratedDocumentOrFail(id, tenantId);

    if (document.status === GeneratedDocumentStatus.DRAFT) {
      throw new BadRequestException({
        code: 'DOCUMENT_NOT_ISSUED',
        message: 'Draft documents must be issued before export',
      });
    }

    let blobUrl: string;
    if (renderProfile === RenderProfile.FULL_DIGITAL && document.blobUrl) {
      blobUrl = document.blobUrl;
    } else {
      const pdf = await this.documentPdfService.render(document, renderProfile);
      blobUrl = await this.blobStorageService.upload(
        pdf,
        'documents/exports',
        `${document.id}-${renderProfile}-${Date.now()}.pdf`,
      );
    }

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'document.exported',
      entityType: 'generated_document',
      entityId: document.id,
      changes: {
        renderProfile: { old: null, new: renderProfile },
      },
      correlationId,
      ipAddress,
    });

    return { documentId: document.id, renderProfile, blobUrl };
  }

  /** Document register (People Ops) — filterable, paginated list of generated documents (PRD §6.8.4). */
  async listRegister(
    query: QueryDocumentRegisterDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DocumentRegisterResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.generatedDocumentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.templateVersion', 'templateVersion')
      .leftJoinAndSelect('templateVersion.template', 'template')
      .where('doc.tenantId = :tenantId', { tenantId });

    if (query.legalEntityId) {
      qb.andWhere('doc.legalEntityId = :legalEntityId', {
        legalEntityId: query.legalEntityId,
      });
    }
    if (query.status) {
      qb.andWhere('doc.status = :status', { status: query.status });
    }
    if (query.workerId) {
      qb.andWhere('doc.workerId = :workerId', { workerId: query.workerId });
    }
    if (query.templateCode) {
      qb.andWhere('template.code = :templateCode', {
        templateCode: query.templateCode,
      });
    }

    qb.orderBy('doc.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  validateMergeFields(
    schema: Record<string, unknown>,
    mergeData: Record<string, unknown>,
  ): void {
    const missing: string[] = [];

    for (const field of Object.keys(schema)) {
      const value = mergeData[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'MERGE_FIELDS_UNRESOLVED',
        message: 'Required merge fields are missing',
        details: { missing },
      });
    }
  }

  /** Rejects a version body referencing {{tokens}} absent from its declared schema (FLW-DOC template integrity). */
  private assertBodyTokensResolvable(
    body: string,
    schema: Record<string, unknown>,
  ): void {
    const tokens = new Set<string>();
    for (const match of body.matchAll(MERGE_FIELD_TOKEN_PATTERN)) {
      if (match[1]) {
        tokens.add(match[1]);
      }
    }

    const unresolved = [...tokens].filter((token) => !(token in schema));
    if (unresolved.length > 0) {
      throw new BadRequestException({
        code: 'MERGE_FIELDS_UNDECLARED',
        message: 'Body references merge fields not declared in the schema',
        details: { unresolved },
      });
    }
  }

  private async findGeneratedDocumentOrFail(
    id: string,
    tenantId: string,
  ): Promise<GeneratedDocumentEntity> {
    const document = await this.generatedDocumentRepository.findOne({
      where: { id, tenantId },
    });
    if (!document) {
      throw new NotFoundException({
        code: 'GENERATED_DOCUMENT_NOT_FOUND',
        message: 'Generated document not found',
      });
    }
    return document;
  }

  private async findTemplateOrFail(
    id: string,
    tenantId: string,
  ): Promise<DocumentTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
      relations: ['versions'],
    });
    if (!template) {
      throw new NotFoundException({
        code: 'DOCUMENT_TEMPLATE_NOT_FOUND',
        message: 'Document template not found',
      });
    }
    return template;
  }

  private async nextVersionNumber(
    templateId: string,
    tenantId: string,
  ): Promise<number> {
    const latest = await this.templateVersionRepository.findOne({
      where: { templateId, tenantId },
      order: { version: 'DESC' },
      select: ['version'],
    });
    return (latest?.version ?? 0) + 1;
  }
}
