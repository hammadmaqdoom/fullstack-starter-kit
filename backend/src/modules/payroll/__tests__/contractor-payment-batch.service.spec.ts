import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
import { ContractorInvoiceStatus } from '@/modules/operations/enums/contractor-invoice.enum';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ContractorPaymentBatchService } from '../contractor-payment-batch.service';
import { ContractorPaymentBatchEntity } from '../entities/contractor-payment-batch.entity';
import { ContractorPaymentLineEntity } from '../entities/contractor-payment-line.entity';
import {
  ContractorPaymentBatchStatus,
  ExportFileFormat,
} from '../enums/payroll.enum';
import { PayslipBlobStorageService } from '../payslip-blob-storage.service';

describe('ContractorPaymentBatchService', () => {
  let service: ContractorPaymentBatchService;
  let batchRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let lineRepository: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  let invoiceRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let workerRepository: { find: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let blobStorageService: { upload: jest.Mock };

  const userId = 'u0000000-0000-4000-8000-000000000001';
  const legalEntityId = 'le000000-0000-4000-8000-000000000001';
  const batchId = 'ba000000-0000-4000-8000-000000000001';
  const invoiceId1 = 'in000000-0000-4000-8000-000000000001';
  const invoiceId2 = 'in000000-0000-4000-8000-000000000002';
  const workerId1 = 'w0000000-0000-4000-8000-000000000001';
  const workerId2 = 'w0000000-0000-4000-8000-000000000002';

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

  const buildInvoice = (
    overrides: Partial<ContractorInvoiceEntity> = {},
  ): ContractorInvoiceEntity =>
    ({
      id: invoiceId1,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      workerId: workerId1,
      invoiceNumber: 'INV-0001',
      grossAmount: '1500.00',
      currencyCode: 'USD',
      status: ContractorInvoiceStatus.FINANCE_APPROVED,
      ...overrides,
    }) as ContractorInvoiceEntity;

  const buildBatch = (
    overrides: Partial<ContractorPaymentBatchEntity> = {},
  ): ContractorPaymentBatchEntity =>
    ({
      id: batchId,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      status: ContractorPaymentBatchStatus.REVIEW,
      totalAmount: '1500.00',
      currencyCode: 'USD',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ContractorPaymentBatchEntity;

  const buildLine = (
    overrides: Partial<ContractorPaymentLineEntity> = {},
  ): ContractorPaymentLineEntity =>
    ({
      id: 'li000000-0000-4000-8000-000000000001',
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      batchId,
      invoiceId: invoiceId1,
      workerId: workerId1,
      amount: '1500.00',
      withholdingTax: null,
      paymentReference: null,
      paymentValueDate: null,
      swiftUetr: null,
      paidAt: null,
      createdAt: new Date(),
      ...overrides,
    }) as ContractorPaymentLineEntity;

  beforeEach(async () => {
    batchRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn().mockResolvedValue(buildBatch()),
      save: jest.fn(async (entity) => ({ ...entity, updatedAt: new Date() })),
    };
    lineRepository = {
      find: jest.fn().mockResolvedValue([buildLine()]),
      findOne: jest.fn().mockResolvedValue(buildLine()),
      save: jest.fn(async (entity) => entity),
    };
    invoiceRepository = {
      find: jest.fn().mockResolvedValue([buildInvoice()]),
      findOne: jest.fn().mockResolvedValue(buildInvoice()),
      save: jest.fn(async (entity) => entity),
    };
    workerRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: workerId1,
          firstName: 'Jane',
          lastName: 'Doe',
        },
      ]),
    };
    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn().mockResolvedValue(financeAuth) };
    blobStorageService = {
      upload: jest.fn().mockResolvedValue('https://blob/contractor-batch.xlsx'),
    };

    dataSource = {
      transaction: jest.fn(async (callback) => {
        const manager = {
          create: jest.fn((_entity: unknown, obj: Record<string, unknown>) => ({
            ...obj,
          })),
          save: jest.fn(async (a: unknown, b?: unknown) => {
            if (b !== undefined) {
              return b;
            }
            if (Array.isArray(a)) {
              return a.map((item, index) => ({
                ...(item as Record<string, unknown>),
                id: `li00000-0000-4000-8000-00000000000${index}`,
                createdAt: new Date(),
              }));
            }
            return {
              ...(a as Record<string, unknown>),
              id: batchId,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
        };
        return callback(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractorPaymentBatchService,
        {
          provide: getRepositoryToken(ContractorPaymentBatchEntity),
          useValue: batchRepository,
        },
        {
          provide: getRepositoryToken(ContractorPaymentLineEntity),
          useValue: lineRepository,
        },
        {
          provide: getRepositoryToken(ContractorInvoiceEntity),
          useValue: invoiceRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
        { provide: DataSource, useValue: dataSource },
        { provide: PayslipBlobStorageService, useValue: blobStorageService },
      ],
    }).compile();

    service = module.get(ContractorPaymentBatchService);
  });

  describe('createBatch', () => {
    it('aggregates finance-approved invoices into a review batch, queues invoices, and audits both', async () => {
      invoiceRepository.find.mockResolvedValue([
        buildInvoice({
          id: invoiceId1,
          workerId: workerId1,
          grossAmount: '1500.00',
        }),
        buildInvoice({
          id: invoiceId2,
          workerId: workerId2,
          grossAmount: '500.00',
        }),
      ]);

      const result = await service.createBatch(
        {
          legalEntityId,
          periodStart: '2026-08-01',
          periodEnd: '2026-08-31',
          currencyCode: 'usd',
        },
        { userId, correlationId: 'corr-1' },
      );

      expect(result.status).toBe(ContractorPaymentBatchStatus.REVIEW);
      expect(result.totalAmount).toBe('2000.00');
      expect(result.currencyCode).toBe('USD');
      expect(result.lines).toHaveLength(2);

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.contractor_payment_batch.create',
          entityType: 'contractor_payment_batch',
          correlationId: 'corr-1',
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractor_invoice.queue',
          entityType: 'contractor_invoice',
          entityId: invoiceId1,
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractor_invoice.queue',
          entityType: 'contractor_invoice',
          entityId: invoiceId2,
        }),
      );
    });

    it('throws BadRequestException when no finance-approved invoices exist for the legal entity', async () => {
      invoiceRepository.find.mockResolvedValue([]);

      await expect(
        service.createBatch(
          {
            legalEntityId,
            periodStart: '2026-08-01',
            periodEnd: '2026-08-31',
            currencyCode: 'USD',
          },
          { userId },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the actor is not a payroll admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.createBatch(
          {
            legalEntityId,
            periodStart: '2026-08-01',
            periodEnd: '2026-08-31',
            currencyCode: 'USD',
          },
          { userId },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(invoiceRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('approveBatch', () => {
    it('approves a batch in review status, sets approvedBy/At and audits', async () => {
      const result = await service.approveBatch(batchId, {
        userId,
        correlationId: 'corr-2',
      });

      expect(result.status).toBe(ContractorPaymentBatchStatus.APPROVED);
      expect(result.approvedBy).toBe(userId);
      expect(result.approvedAt).toBeInstanceOf(Date);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.contractor_payment_batch.approve',
          correlationId: 'corr-2',
          changes: expect.objectContaining({
            status: {
              old: ContractorPaymentBatchStatus.REVIEW,
              new: ContractorPaymentBatchStatus.APPROVED,
            },
          }),
        }),
      );
    });

    it('is idempotent when the batch is already approved', async () => {
      batchRepository.findOne.mockResolvedValue(
        buildBatch({
          status: ContractorPaymentBatchStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date('2026-08-01T00:00:00Z'),
        }),
      );

      const result = await service.approveBatch(batchId, { userId });

      expect(result.status).toBe(ContractorPaymentBatchStatus.APPROVED);
      expect(batchRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when approving from draft status', async () => {
      batchRepository.findOne.mockResolvedValue(
        buildBatch({ status: ContractorPaymentBatchStatus.DRAFT }),
      );

      await expect(
        service.approveBatch(batchId, { userId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(batchRepository.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the actor is not a payroll admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.approveBatch(batchId, { userId }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('exportBatch', () => {
    it('generates an xlsx pack, uploads it, and moves an approved batch to exported', async () => {
      batchRepository.findOne.mockResolvedValue(
        buildBatch({ status: ContractorPaymentBatchStatus.APPROVED }),
      );

      const result = await service.exportBatch(
        batchId,
        { userId, correlationId: 'corr-3' },
        ExportFileFormat.XLSX,
      );

      expect(result.blobUrl).toBe('https://blob/contractor-batch.xlsx');
      expect(result.batch.status).toBe(ContractorPaymentBatchStatus.EXPORTED);
      expect(blobStorageService.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        'contractor-payment-exports',
        expect.stringContaining('.xlsx'),
        expect.any(String),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.contractor_payment_batch.export',
          correlationId: 'corr-3',
        }),
      );
    });

    it('throws BadRequestException when the batch is not yet approved', async () => {
      batchRepository.findOne.mockResolvedValue(
        buildBatch({ status: ContractorPaymentBatchStatus.REVIEW }),
      );

      await expect(
        service.exportBatch(batchId, { userId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(blobStorageService.upload).not.toHaveBeenCalled();
    });
  });

  describe('markLinePaid', () => {
    it('marks a line paid and moves its invoice to paid', async () => {
      lineRepository.findOne.mockResolvedValue(buildLine());
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.QUEUED }),
      );

      const result = await service.markLinePaid(
        'li000000-0000-4000-8000-000000000001',
        { paymentReference: 'REF-123', paymentValueDate: '2026-08-15' },
        { userId, correlationId: 'corr-4' },
      );

      expect(result.paidAt).toBeInstanceOf(Date);
      expect(result.paymentReference).toBe('REF-123');
      expect(invoiceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ContractorInvoiceStatus.PAID }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.contractor_payment_line.mark_paid',
          correlationId: 'corr-4',
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractor_invoice.paid',
          entityType: 'contractor_invoice',
        }),
      );
    });

    it('is idempotent when the line is already paid', async () => {
      lineRepository.findOne.mockResolvedValue(
        buildLine({ paidAt: new Date('2026-08-15T00:00:00Z') }),
      );

      const result = await service.markLinePaid(
        'li000000-0000-4000-8000-000000000001',
        { paymentReference: 'REF-999' },
        { userId },
      );

      expect(result.paymentReference).toBeNull();
      expect(lineRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the actor is not a payroll admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.markLinePaid(
          'li000000-0000-4000-8000-000000000001',
          { paymentReference: 'REF-1' },
          { userId },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
