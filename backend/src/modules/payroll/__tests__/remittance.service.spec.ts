import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RemittanceCorridorConfigEntity } from '../entities/remittance-corridor-config.entity';
import { RemittancePackDocumentEntity } from '../entities/remittance-pack-document.entity';
import { RemittancePackEntity } from '../entities/remittance-pack.entity';
import { PayslipEntity } from '../entities/payslip.entity';
import {
  RemittanceCorridorAppliesTo,
  RemittanceDocumentSource,
  RemittanceDocumentStatus,
  RemittanceDocumentType,
  RemittancePackStatus,
  RemittancePaymentSourceType,
} from '../enums/remittance.enum';
import { PayslipBlobStorageService } from '../payslip-blob-storage.service';
import { RemittanceService } from '../remittance.service';

describe('RemittanceService', () => {
  let service: RemittanceService;
  let corridorRepository: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock; create: jest.Mock; createQueryBuilder: jest.Mock };
  let packRepository: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let documentRepository: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let workerRepository: { findOne: jest.Mock };
  let legalEntityRepository: { findOne: jest.Mock };
  let payslipRepository: { findOne: jest.Mock };
  let invoiceRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };
  let blobStorageService: { upload: jest.Mock };

  const userId = 'u0000000-0000-4000-8000-000000000001';
  const legalEntityId = 'le000000-0000-4000-8000-000000000001';
  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const payRunId = 'pr000000-0000-4000-8000-000000000001';
  const lineId = 'li000000-0000-4000-8000-000000000001';
  const corridorId = 'cc000000-0000-4000-8000-000000000001';
  const packId = 'pk000000-0000-4000-8000-000000000001';

  const financeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId,
    roleCodes: [PolarisRoleCode.FINANCE],
    assignments: [
      {
        roleId: 'role-1',
        roleCode: PolarisRoleCode.FINANCE,
        scopeType: ScopeType.ALL,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.ALL,
  };

  const employeeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId,
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [
      {
        roleId: 'role-2',
        roleCode: PolarisRoleCode.EMPLOYEE,
        scopeType: ScopeType.OWN,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.OWN,
  };

  const buildCorridor = (
    overrides: Partial<RemittanceCorridorConfigEntity> = {},
  ): RemittanceCorridorConfigEntity =>
    ({
      id: corridorId,
      tenantId: DIGITARO_TENANT_ID,
      payerCountryCode: 'PK',
      beneficiaryBankCountryCode: 'AE',
      legalEntityId: null,
      appliesTo: RemittanceCorridorAppliesTo.ALL,
      requiredDocTypes: [
        RemittanceDocumentType.PAYSLIP_PDF,
        RemittanceDocumentType.SWIFT_COPY,
      ],
      isActive: true,
      effectiveFrom: '2026-01-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as RemittanceCorridorConfigEntity;

  const buildPack = (
    overrides: Partial<RemittancePackEntity> = {},
  ): RemittancePackEntity =>
    ({
      id: packId,
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      paymentSourceType: RemittancePaymentSourceType.PAY_RUN_LINE,
      paymentSourceId: lineId,
      invoiceId: null,
      payRunId,
      corridorConfigId: corridorId,
      status: RemittancePackStatus.ASSEMBLING,
      paymentReference: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as RemittancePackEntity;

  const buildWorker = (overrides: Partial<WorkerEntity> = {}): WorkerEntity =>
    ({
      id: workerId,
      countryCode: 'PK',
      bankCountryCode: 'AE',
      ...overrides,
    }) as WorkerEntity;

  const buildLegalEntity = (
    overrides: Partial<LegalEntityEntity> = {},
  ): LegalEntityEntity =>
    ({
      id: legalEntityId,
      countryCode: 'PK',
      ...overrides,
    }) as LegalEntityEntity;

  beforeEach(async () => {
    corridorRepository = {
      find: jest.fn().mockResolvedValue([buildCorridor()]),
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
      create: jest.fn((obj) => obj),
      createQueryBuilder: jest.fn(),
    };
    packRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (entity) => ({ ...entity, id: entity.id ?? packId })),
      create: jest.fn((obj) => obj),
    };
    documentRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (entity) => entity),
      create: jest.fn((obj) => obj),
    };
    workerRepository = { findOne: jest.fn().mockResolvedValue(buildWorker()) };
    legalEntityRepository = {
      findOne: jest.fn().mockResolvedValue(buildLegalEntity()),
    };
    payslipRepository = { findOne: jest.fn() };
    invoiceRepository = { findOne: jest.fn() };
    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn().mockResolvedValue(financeAuth) };
    blobStorageService = {
      upload: jest.fn().mockResolvedValue('https://blob/remittance/doc.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemittanceService,
        {
          provide: getRepositoryToken(RemittanceCorridorConfigEntity),
          useValue: corridorRepository,
        },
        {
          provide: getRepositoryToken(RemittancePackEntity),
          useValue: packRepository,
        },
        {
          provide: getRepositoryToken(RemittancePackDocumentEntity),
          useValue: documentRepository,
        },
        { provide: getRepositoryToken(WorkerEntity), useValue: workerRepository },
        {
          provide: getRepositoryToken(LegalEntityEntity),
          useValue: legalEntityRepository,
        },
        {
          provide: getRepositoryToken(PayslipEntity),
          useValue: payslipRepository,
        },
        {
          provide: getRepositoryToken(ContractorInvoiceEntity),
          useValue: invoiceRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
        { provide: PayslipBlobStorageService, useValue: blobStorageService },
      ],
    }).compile();

    service = module.get(RemittanceService);
  });

  describe('ensurePackForPayslip (corridor match + cross-border creation)', () => {
    it('matches the active corridor and creates an assembling pack with pending required docs', async () => {
      const pack = await service.ensurePackForPayslip({
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        legalEntityId,
        payRunId,
        paymentSourceId: lineId,
        actor: { userId },
      });

      expect(pack).not.toBeNull();
      expect(pack?.status).toBe(RemittancePackStatus.ASSEMBLING);
      expect(pack?.corridorConfigId).toBe(corridorId);
      expect(pack?.paymentSourceType).toBe(
        RemittancePaymentSourceType.PAY_RUN_LINE,
      );

      expect(documentRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            documentType: RemittanceDocumentType.PAYSLIP_PDF,
            status: RemittanceDocumentStatus.PENDING,
            source: RemittanceDocumentSource.AUTO,
          }),
          expect.objectContaining({
            documentType: RemittanceDocumentType.SWIFT_COPY,
            status: RemittanceDocumentStatus.PENDING,
          }),
        ]),
      );

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.remittance_pack.create',
          entityType: 'remittance_pack',
        }),
      );
    });

    it('prefers a legal-entity-specific corridor over a tenant-wide one', async () => {
      corridorRepository.find.mockResolvedValue([
        buildCorridor({ id: 'generic-corridor', legalEntityId: null }),
        buildCorridor({ id: 'specific-corridor', legalEntityId }),
      ]);

      const pack = await service.ensurePackForPayslip({
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        legalEntityId,
        payRunId,
        paymentSourceId: lineId,
        actor: { userId },
      });

      expect(pack?.corridorConfigId).toBe('specific-corridor');
    });

    it('returns null (no pack) when the payer country equals the worker bank country', async () => {
      workerRepository.findOne.mockResolvedValue(
        buildWorker({ bankCountryCode: 'PK' }),
      );

      const pack = await service.ensurePackForPayslip({
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        legalEntityId,
        payRunId,
        paymentSourceId: lineId,
        actor: { userId },
      });

      expect(pack).toBeNull();
      expect(corridorRepository.find).not.toHaveBeenCalled();
      expect(packRepository.save).not.toHaveBeenCalled();
    });

    it('returns null when cross-border but no active corridor matches', async () => {
      corridorRepository.find.mockResolvedValue([]);

      const pack = await service.ensurePackForPayslip({
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        legalEntityId,
        payRunId,
        paymentSourceId: lineId,
        actor: { userId },
      });

      expect(pack).toBeNull();
      expect(packRepository.save).not.toHaveBeenCalled();
    });

    it('is idempotent — returns the existing pack without re-evaluating the corridor', async () => {
      const existing = buildPack();
      packRepository.findOne.mockResolvedValue(existing);

      const pack = await service.ensurePackForPayslip({
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        legalEntityId,
        payRunId,
        paymentSourceId: lineId,
        actor: { userId },
      });

      expect(pack).toBe(existing);
      expect(workerRepository.findOne).not.toHaveBeenCalled();
      expect(packRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('ensurePackForContractorPayment', () => {
    it('creates a pack scoped to contractor_invoice corridors', async () => {
      corridorRepository.find.mockResolvedValue([
        buildCorridor({ appliesTo: RemittanceCorridorAppliesTo.CONTRACTOR_INVOICE }),
      ]);
      const invoiceId = 'in000000-0000-4000-8000-000000000001';

      const pack = await service.ensurePackForContractorPayment({
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        legalEntityId,
        invoiceId,
        paymentSourceId: lineId,
        actor: { userId },
      });

      expect(pack?.paymentSourceType).toBe(
        RemittancePaymentSourceType.CONTRACTOR_PAYMENT_LINE,
      );
      expect(pack?.invoiceId).toBe(invoiceId);
      expect(pack?.payRunId).toBeNull();
    });

    it('does not match a corridor scoped only to employee_payroll', async () => {
      corridorRepository.find.mockResolvedValue([
        buildCorridor({ appliesTo: RemittanceCorridorAppliesTo.EMPLOYEE_PAYROLL }),
      ]);

      const pack = await service.ensurePackForContractorPayment({
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        legalEntityId,
        invoiceId: 'in000000-0000-4000-8000-000000000001',
        paymentSourceId: lineId,
        actor: { userId },
      });

      expect(pack).toBeNull();
    });
  });

  describe('uploadForPayRunLine (Finance upload completes the pack)', () => {
    it('marks a pending document available, uploads the blob, and audits the upload', async () => {
      const pack = buildPack();
      packRepository.findOne.mockResolvedValue(pack);
      documentRepository.findOne.mockResolvedValue({
        id: 'doc-1',
        tenantId: DIGITARO_TENANT_ID,
        packId: pack.id,
        documentType: RemittanceDocumentType.SWIFT_COPY,
        source: RemittanceDocumentSource.AUTO,
        blobUrl: null,
        status: RemittanceDocumentStatus.PENDING,
        uploadedBy: null,
        uploadedAt: null,
      });
      documentRepository.find.mockResolvedValue([
        {
          id: 'doc-0',
          status: RemittanceDocumentStatus.AVAILABLE,
        },
        {
          id: 'doc-1',
          status: RemittanceDocumentStatus.AVAILABLE,
        },
      ]);

      const file = {
        buffer: Buffer.from('swift-copy'),
        originalname: 'swift.pdf',
        mimetype: 'application/pdf',
      } as unknown as import('@nest-lab/fastify-multer').File;

      const document = await service.uploadForPayRunLine(
        lineId,
        { documentType: RemittanceDocumentType.SWIFT_COPY },
        file,
        { userId, correlationId: 'corr-1' },
      );

      expect(document.status).toBe(RemittanceDocumentStatus.AVAILABLE);
      expect(document.blobUrl).toBe('https://blob/remittance/doc.pdf');
      expect(document.source).toBe(RemittanceDocumentSource.FINANCE_UPLOAD);
      expect(blobStorageService.upload).toHaveBeenCalledWith(
        file.buffer,
        'remittance-documents',
        expect.stringContaining('swift.pdf'),
        'application/pdf',
      );

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.remittance_pack.upload_document',
          entityType: 'remittance_pack_document',
          correlationId: 'corr-1',
        }),
      );

      // All required docs available -> pack completes.
      expect(packRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RemittancePackStatus.COMPLETE }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.remittance_pack.status_change',
          entityType: 'remittance_pack',
          changes: {
            status: {
              old: RemittancePackStatus.ASSEMBLING,
              new: RemittancePackStatus.COMPLETE,
            },
          },
        }),
      );
    });

    it('moves the pack to partial when only some required docs are available', async () => {
      const pack = buildPack();
      packRepository.findOne.mockResolvedValue(pack);
      documentRepository.find.mockResolvedValue([
        { id: 'doc-0', status: RemittanceDocumentStatus.AVAILABLE },
        { id: 'doc-1', status: RemittanceDocumentStatus.PENDING },
      ]);

      const file = {
        buffer: Buffer.from('payslip'),
        originalname: 'payslip.pdf',
        mimetype: 'application/pdf',
      } as unknown as import('@nest-lab/fastify-multer').File;

      await service.uploadForPayRunLine(
        lineId,
        { documentType: RemittanceDocumentType.PAYSLIP_PDF },
        file,
        { userId },
      );

      expect(packRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RemittancePackStatus.PARTIAL }),
      );
    });

    it('throws NotFoundException when no pack exists for the pay run line', async () => {
      packRepository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadForPayRunLine(
          lineId,
          { documentType: RemittanceDocumentType.SWIFT_COPY },
          {
            buffer: Buffer.from('x'),
            originalname: 'x.pdf',
            mimetype: 'application/pdf',
          } as unknown as import('@nest-lab/fastify-multer').File,
          { userId },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the actor is not a payroll admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.uploadForPayRunLine(
          lineId,
          { documentType: RemittanceDocumentType.SWIFT_COPY },
          {
            buffer: Buffer.from('x'),
            originalname: 'x.pdf',
            mimetype: 'application/pdf',
          } as unknown as import('@nest-lab/fastify-multer').File,
          { userId },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(packRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('generatePaymentAdvice', () => {
    const buildPayslip = (
      overrides: Partial<PayslipEntity> = {},
    ): PayslipEntity =>
      ({
        id: 'ps000000-0000-4000-8000-000000000001',
        tenantId: DIGITARO_TENANT_ID,
        legalEntityId,
        payRunLineItemId: lineId,
        workerId,
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        netPay: '5000.00',
        currencyCode: 'AED',
        ...overrides,
      }) as PayslipEntity;

    it('renders the payment advice PDF, uploads it, and marks the document available', async () => {
      const pack = buildPack({ paymentReference: 'REF-123' });
      packRepository.findOne.mockResolvedValue(pack);
      payslipRepository.findOne.mockResolvedValue(buildPayslip());

      const document = await service.generatePaymentAdvice(packId, {
        userId,
        correlationId: 'corr-9',
      });

      expect(blobStorageService.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        'remittance-documents',
        expect.stringContaining(packId),
      );
      expect(document.status).toBe(RemittanceDocumentStatus.AVAILABLE);
      expect(document.source).toBe(RemittanceDocumentSource.GENERATED);
      expect(document.documentType).toBe(RemittanceDocumentType.PAYMENT_ADVICE);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.remittance_pack.generate_payment_advice',
          entityType: 'remittance_pack_document',
          correlationId: 'corr-9',
        }),
      );
    });

    it('rejects contractor payment line packs (payroll-only for now)', async () => {
      packRepository.findOne.mockResolvedValue(
        buildPack({
          paymentSourceType: RemittancePaymentSourceType.CONTRACTOR_PAYMENT_LINE,
        }),
      );

      await expect(
        service.generatePaymentAdvice(packId, { userId }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'REMITTANCE_PAYMENT_ADVICE_UNSUPPORTED_SOURCE',
        }),
      });
    });

    it('throws NotFoundException when the pack does not exist', async () => {
      packRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generatePaymentAdvice(packId, { userId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the payslip cannot be resolved', async () => {
      packRepository.findOne.mockResolvedValue(buildPack());
      payslipRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generatePaymentAdvice(packId, { userId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the actor is not a payroll admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.generatePaymentAdvice(packId, { userId }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getPackForPayRunLine', () => {
    it('returns the pack with its documents for a payroll admin', async () => {
      const pack = buildPack();
      packRepository.findOne.mockResolvedValue(pack);
      documentRepository.find.mockResolvedValue([
        { id: 'doc-1', status: RemittanceDocumentStatus.PENDING },
      ]);

      const result = await service.getPackForPayRunLine(lineId, userId);

      expect(result.pack).toBe(pack);
      expect(result.documents).toHaveLength(1);
    });

    it('throws ForbiddenException for a non-admin actor', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.getPackForPayRunLine(lineId, userId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
