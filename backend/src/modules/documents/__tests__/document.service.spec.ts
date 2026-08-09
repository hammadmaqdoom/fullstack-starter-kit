import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { LegalEntityStatutoryIdEntity } from '@/modules/core-hr/entities/legal-entity-statutory-id.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { LegalEntityRenderProfile } from '@/modules/core-hr/enums/org.enum';
import { DocumentTemplateVersionEntity } from '@/modules/country-config/entities/document-template-version.entity';
import { DocumentTemplateEntity } from '@/modules/country-config/entities/document-template.entity';
import { DocumentType } from '@/modules/country-config/enums/setup-wizard.enum';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentBlobStorageService } from '../document-blob-storage.service';
import { DocumentNumberService } from '../document-number.service';
import { DocumentPdfService } from '../document-pdf.service';
import { DocumentService } from '../document.service';
import { GeneratedDocumentEntity } from '../entities/generated-document.entity';
import { LetterheadConfigEntity } from '../entities/letterhead-config.entity';
import { GeneratedDocumentStatus, RenderProfile } from '../enums/document.enum';

describe('DocumentService — issue / export / register', () => {
  let service: DocumentService;
  let generatedDocumentRepository: jest.Mocked<
    Pick<
      Repository<GeneratedDocumentEntity>,
      'findOne' | 'save' | 'createQueryBuilder'
    >
  >;
  let templateVersionRepository: jest.Mocked<
    Pick<Repository<DocumentTemplateVersionEntity>, 'findOne'>
  >;
  let legalEntityRepository: jest.Mocked<
    Pick<Repository<LegalEntityEntity>, 'findOne'>
  >;
  let letterheadRepository: jest.Mocked<
    Pick<Repository<LetterheadConfigEntity>, 'findOne'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let dataSource: { transaction: jest.Mock };
  let documentNumberService: jest.Mocked<Pick<DocumentNumberService, 'next'>>;
  let documentPdfService: jest.Mocked<Pick<DocumentPdfService, 'render'>>;
  let blobStorageService: jest.Mocked<
    Pick<DocumentBlobStorageService, 'upload'>
  >;

  const tenantId = DIGITARO_TENANT_ID;
  const documentId = 'd0000000-0000-4000-8000-000000000001';
  const legalEntityId = 'e0000000-0000-4000-8000-000000000001';
  const templateVersionId = 'tv000000-0000-4000-8000-000000000001';
  const actorId = 'u0000000-0000-4000-8000-000000000001';

  const legalEntity = {
    id: legalEntityId,
    tenantId,
    code: 'DIGITARO_LABS_PK',
    registeredName: 'Digitaro Labs (Private) Limited',
    tradingName: null,
    requiresWetStamp: false,
    stampInstructions: null,
    defaultRenderProfile: LegalEntityRenderProfile.FULL_DIGITAL,
  } as LegalEntityEntity;

  const templateVersion = {
    id: templateVersionId,
    tenantId,
    templateId: 'tmpl-1',
    mergeFieldSchema: { 'worker.firstName': { type: 'string' } },
    template: {
      id: 'tmpl-1',
      documentType: DocumentType.OFFER_LETTER,
    } as DocumentTemplateEntity,
  } as unknown as DocumentTemplateVersionEntity;

  const draftDocument = () =>
    ({
      id: documentId,
      tenantId,
      workerId: 'w-1',
      templateVersionId,
      status: GeneratedDocumentStatus.DRAFT,
      blobUrl: null,
      mergeData: { 'worker.firstName': 'Ada' },
      templateSnapshot: { body: '<p>Dear {{worker.firstName}}</p>' },
      legalEntityId,
      documentNumber: null,
      letterheadConfigId: null,
      issuedBy: null,
      issuedAt: null,
    }) as unknown as GeneratedDocumentEntity;

  beforeEach(async () => {
    generatedDocumentRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
      createQueryBuilder: jest.fn(),
    } as unknown as typeof generatedDocumentRepository;

    templateVersionRepository = { findOne: jest.fn() };
    legalEntityRepository = { findOne: jest.fn() };
    letterheadRepository = { findOne: jest.fn() };
    auditLogService = { append: jest.fn() };
    dataSource = { transaction: jest.fn() };
    documentNumberService = { next: jest.fn() };
    documentPdfService = { render: jest.fn() };
    blobStorageService = { upload: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(DocumentTemplateEntity),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(DocumentTemplateVersionEntity),
          useValue: templateVersionRepository,
        },
        {
          provide: getRepositoryToken(GeneratedDocumentEntity),
          useValue: generatedDocumentRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(LegalEntityEntity),
          useValue: legalEntityRepository,
        },
        {
          provide: getRepositoryToken(LegalEntityStatutoryIdEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(LetterheadConfigEntity),
          useValue: letterheadRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: DataSource, useValue: dataSource },
        { provide: DocumentNumberService, useValue: documentNumberService },
        { provide: DocumentPdfService, useValue: documentPdfService },
        { provide: DocumentBlobStorageService, useValue: blobStorageService },
      ],
    }).compile();

    service = module.get(DocumentService);
  });

  describe('issue', () => {
    beforeEach(() => {
      generatedDocumentRepository.findOne.mockResolvedValue(draftDocument());
      legalEntityRepository.findOne.mockResolvedValue(legalEntity);
      templateVersionRepository.findOne.mockResolvedValue(templateVersion);
      letterheadRepository.findOne.mockResolvedValue(null);
      documentPdfService.render.mockResolvedValue(Buffer.from('%PDF-fake'));
      blobStorageService.upload.mockResolvedValue(
        'https://blob.local/documents/issued/doc.pdf',
      );

      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) => {
          const manager = {
            save: jest.fn(async (_entity: unknown, data: unknown) => data),
          };
          return cb(manager);
        },
      );
    });

    it('assigns an immutable document number and flips status to issued', async () => {
      documentNumberService.next.mockResolvedValue(
        'DIGITARO_LABS_PK-OFR-2026-0001',
      );

      const result = await service.issue(documentId, actorId);

      expect(result.status).toBe(GeneratedDocumentStatus.ISSUED);
      expect(result.documentNumber).toBe('DIGITARO_LABS_PK-OFR-2026-0001');
      expect(result.issuedBy).toBe(actorId);
      expect(result.issuedAt).toBeInstanceOf(Date);
      expect(documentNumberService.next).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId,
          legalEntityId,
          legalEntityCode: 'DIGITARO_LABS_PK',
          documentType: DocumentType.OFFER_LETTER,
        }),
      );
    });

    it('renders and stores the canonical full_digital PDF at issue time', async () => {
      documentNumberService.next.mockResolvedValue(
        'DIGITARO_LABS_PK-OFR-2026-0001',
      );

      const result = await service.issue(documentId, actorId);

      expect(documentPdfService.render).toHaveBeenCalledWith(
        expect.objectContaining({ id: documentId }),
        RenderProfile.FULL_DIGITAL,
      );
      expect(blobStorageService.upload).toHaveBeenCalled();
      expect(result.blobUrl).toBe(
        'https://blob.local/documents/issued/doc.pdf',
      );
    });

    it('writes a document.issue audit_log entry with the assigned number', async () => {
      documentNumberService.next.mockResolvedValue(
        'DIGITARO_LABS_PK-OFR-2026-0001',
      );

      await service.issue(documentId, actorId, 'corr-1', '127.0.0.1');

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'document.issue',
          entityId: documentId,
          correlationId: 'corr-1',
          changes: expect.objectContaining({
            documentNumber: {
              old: null,
              new: 'DIGITARO_LABS_PK-OFR-2026-0001',
            },
          }),
        }),
      );
    });

    it('produces sequential numbers across two issues in the same scope', async () => {
      documentNumberService.next
        .mockResolvedValueOnce('DIGITARO_LABS_PK-OFR-2026-0001')
        .mockResolvedValueOnce('DIGITARO_LABS_PK-OFR-2026-0002');

      const first = await service.issue(documentId, actorId);
      generatedDocumentRepository.findOne.mockResolvedValue(draftDocument());
      const second = await service.issue(documentId, actorId);

      expect(first.documentNumber).toBe('DIGITARO_LABS_PK-OFR-2026-0001');
      expect(second.documentNumber).toBe('DIGITARO_LABS_PK-OFR-2026-0002');
    });

    it('rejects re-issuing a document that is already issued', async () => {
      generatedDocumentRepository.findOne.mockResolvedValue({
        ...draftDocument(),
        status: GeneratedDocumentStatus.ISSUED,
        documentNumber: 'DIGITARO_LABS_PK-OFR-2026-0001',
      });

      await expect(service.issue(documentId, actorId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(documentNumberService.next).not.toHaveBeenCalled();
    });

    it('blocks issue when required merge fields are missing', async () => {
      generatedDocumentRepository.findOne.mockResolvedValue({
        ...draftDocument(),
        mergeData: {},
      });

      await expect(service.issue(documentId, actorId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('exportDocument', () => {
    it('reuses the canonical stored blob for full_digital exports', async () => {
      generatedDocumentRepository.findOne.mockResolvedValue({
        ...draftDocument(),
        status: GeneratedDocumentStatus.ISSUED,
        documentNumber: 'DIGITARO_LABS_PK-OFR-2026-0001',
        blobUrl: 'https://blob.local/canonical.pdf',
      });

      const result = await service.exportDocument(
        documentId,
        RenderProfile.FULL_DIGITAL,
        actorId,
      );

      expect(result.blobUrl).toBe('https://blob.local/canonical.pdf');
      expect(documentPdfService.render).not.toHaveBeenCalled();
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'document.exported',
          changes: {
            renderProfile: { old: null, new: RenderProfile.FULL_DIGITAL },
          },
        }),
      );
    });

    it('renders fresh for print_on_letterhead and does not touch the canonical blob', async () => {
      generatedDocumentRepository.findOne.mockResolvedValue({
        ...draftDocument(),
        status: GeneratedDocumentStatus.ISSUED,
        documentNumber: 'DIGITARO_LABS_PK-OFR-2026-0001',
        blobUrl: 'https://blob.local/canonical.pdf',
      });
      documentPdfService.render.mockResolvedValue(Buffer.from('%PDF-fake'));
      blobStorageService.upload.mockResolvedValue(
        'https://blob.local/exports/print.pdf',
      );

      const result = await service.exportDocument(
        documentId,
        RenderProfile.PRINT_ON_LETTERHEAD,
        actorId,
      );

      expect(documentPdfService.render).toHaveBeenCalledWith(
        expect.objectContaining({ id: documentId }),
        RenderProfile.PRINT_ON_LETTERHEAD,
      );
      expect(result.blobUrl).toBe('https://blob.local/exports/print.pdf');
    });

    it('rejects exporting a document that is still a draft', async () => {
      generatedDocumentRepository.findOne.mockResolvedValue(draftDocument());

      await expect(
        service.exportDocument(documentId, RenderProfile.FULL_DIGITAL, actorId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listRegister', () => {
    it('applies filters and pagination through the query builder', async () => {
      const getManyAndCount = jest
        .fn()
        .mockResolvedValue([[draftDocument()], 1]);
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      generatedDocumentRepository.createQueryBuilder.mockReturnValue(
        qb as never,
      );

      const result = await service.listRegister({
        legalEntityId,
        status: GeneratedDocumentStatus.ISSUED,
        page: 2,
        limit: 10,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'doc.legalEntityId = :legalEntityId',
        { legalEntityId },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('doc.status = :status', {
        status: GeneratedDocumentStatus.ISSUED,
      });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });
});
