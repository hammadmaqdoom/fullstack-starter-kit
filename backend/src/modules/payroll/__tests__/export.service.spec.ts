import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinanceExportProfileEntity } from '../entities/finance-export-profile.entity';
import { PayRunExportBatchEntity } from '../entities/pay-run-export-batch.entity';
import { PayRunLineItemEntity } from '../entities/pay-run-line-item.entity';
import { PayRunEntity } from '../entities/pay-run.entity';
import { ExportFileFormat, PayRunStatus } from '../enums/payroll.enum';
import { ExportService } from '../export.service';
import { PayslipBlobStorageService } from '../payslip-blob-storage.service';

describe('ExportService', () => {
  let service: ExportService;
  let exportProfileRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let exportBatchRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let payRunRepository: { findOne: jest.Mock; save: jest.Mock };
  let lineItemRepository: { find: jest.Mock };
  let workerRepository: { find: jest.Mock };
  let legalEntityRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };
  let blobStorageService: { upload: jest.Mock };

  const userId = 'u0000000-0000-4000-8000-000000000001';
  const legalEntityId = 'le000000-0000-4000-8000-000000000001';
  const payRunId = 'pr000000-0000-4000-8000-000000000001';
  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const exportProfileId = 'ep000000-0000-4000-8000-000000000001';

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

  const buildPayRun = (overrides: Partial<PayRunEntity> = {}): PayRunEntity =>
    ({
      id: payRunId,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      countryCode: 'PK',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      status: PayRunStatus.APPROVED,
      functionalCurrency: 'PKR',
      ...overrides,
    }) as PayRunEntity;

  const buildLineItem = (
    overrides: Partial<PayRunLineItemEntity> = {},
  ): PayRunLineItemEntity =>
    ({
      id: 'li000000-0000-4000-8000-000000000001',
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      payRunId,
      workerId,
      grossPay: '120000.00',
      totalDeductions: '20000.00',
      netPay: '100000.00',
      currencyCode: 'PKR',
      paymentReference: null,
      ...overrides,
    }) as PayRunLineItemEntity;

  const buildWorker = (overrides: Partial<WorkerEntity> = {}): WorkerEntity =>
    ({
      id: workerId,
      tenantId: DIGITARO_TENANT_ID,
      firstName: 'Ayesha',
      lastName: 'Khan',
      ...overrides,
    }) as WorkerEntity;

  const buildExportProfile = (
    overrides: Partial<FinanceExportProfileEntity> = {},
  ): FinanceExportProfileEntity =>
    ({
      id: exportProfileId,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId: null,
      countryCode: null,
      name: 'Default pay run export',
      columnMappings: [
        { key: 'workerName', header: 'Worker' },
        { key: 'bankAccount', header: 'Bank Account' },
        { key: 'grossPay', header: 'Gross Pay' },
        { key: 'totalDeductions', header: 'Total Deductions' },
        { key: 'netPay', header: 'Net Pay' },
        { key: 'currencyCode', header: 'Currency' },
        { key: 'paymentRef', header: 'Payment Reference' },
      ],
      fileFormats: [ExportFileFormat.CSV, ExportFileFormat.PDF],
      isDefault: true,
      ...overrides,
    }) as FinanceExportProfileEntity;

  beforeEach(async () => {
    exportProfileRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((input) => input),
      save: jest.fn((input) =>
        Promise.resolve({ id: exportProfileId, ...input }),
      ),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    exportBatchRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((input) => input),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'batch-0000-4000-8000-000000000001', ...input }),
      ),
    };
    payRunRepository = {
      findOne: jest.fn().mockResolvedValue(buildPayRun()),
      save: jest.fn((input) => Promise.resolve(input)),
    };
    lineItemRepository = {
      find: jest.fn().mockResolvedValue([buildLineItem()]),
    };
    workerRepository = {
      find: jest.fn().mockResolvedValue([buildWorker()]),
    };
    legalEntityRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: legalEntityId,
        registeredName: 'Digitaro Labs Pvt Ltd',
      } as LegalEntityEntity),
    };
    auditLogService = { append: jest.fn().mockResolvedValue(undefined) };
    rbacService = { getAuthContext: jest.fn().mockResolvedValue(financeAuth) };
    blobStorageService = {
      upload: jest
        .fn()
        .mockResolvedValue('https://blob.local/payroll-exports/file.csv'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getRepositoryToken(FinanceExportProfileEntity),
          useValue: exportProfileRepository,
        },
        {
          provide: getRepositoryToken(PayRunExportBatchEntity),
          useValue: exportBatchRepository,
        },
        {
          provide: getRepositoryToken(PayRunEntity),
          useValue: payRunRepository,
        },
        {
          provide: getRepositoryToken(PayRunLineItemEntity),
          useValue: lineItemRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        {
          provide: getRepositoryToken(LegalEntityEntity),
          useValue: legalEntityRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
        { provide: PayslipBlobStorageService, useValue: blobStorageService },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  describe('exportPayRun', () => {
    it('exports an approved pay run: creates a batch and marks it exported', async () => {
      exportProfileRepository.findOne.mockResolvedValue(buildExportProfile());

      const batch = await service.exportPayRun(
        payRunId,
        { exportProfileId, fileFormat: ExportFileFormat.CSV },
        { userId, tenantId: DIGITARO_TENANT_ID },
      );

      expect(batch.fileFormat).toBe(ExportFileFormat.CSV);
      expect(batch.blobUrl).toBe('https://blob.local/payroll-exports/file.csv');
      expect(blobStorageService.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        'payroll-exports',
        expect.stringContaining('.csv'),
        'text/csv',
      );

      const savedPayRun = payRunRepository.save.mock.calls[0][0];
      expect(savedPayRun.status).toBe(PayRunStatus.EXPORTED);
    });

    it('throws when the pay run is still draft', async () => {
      payRunRepository.findOne.mockResolvedValue(
        buildPayRun({ status: PayRunStatus.DRAFT }),
      );

      await expect(
        service.exportPayRun(
          payRunId,
          {},
          { userId, tenantId: DIGITARO_TENANT_ID },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(exportBatchRepository.save).not.toHaveBeenCalled();
    });

    it('creates and uses a default profile with the standard column headers when none is configured', async () => {
      exportProfileRepository.find.mockResolvedValue([]);

      await service.exportPayRun(
        payRunId,
        { fileFormat: ExportFileFormat.CSV },
        { userId, tenantId: DIGITARO_TENANT_ID },
      );

      expect(exportProfileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          columnMappings: expect.arrayContaining([
            { key: 'workerName', header: 'Worker' },
            { key: 'netPay', header: 'Net Pay' },
          ]),
          isDefault: true,
        }),
      );

      const csvBuffer: Buffer = blobStorageService.upload.mock.calls[0][0];
      const csv = csvBuffer.toString('utf-8');
      expect(csv.split('\n')[0]).toContain('Net Pay');
    });

    it('writes an audit log entry for the export', async () => {
      exportProfileRepository.findOne.mockResolvedValue(buildExportProfile());

      await service.exportPayRun(
        payRunId,
        { exportProfileId, fileFormat: ExportFileFormat.CSV },
        { userId, tenantId: DIGITARO_TENANT_ID, correlationId: 'corr-1' },
      );

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: DIGITARO_TENANT_ID,
          actorId: userId,
          action: 'payroll.pay_run.export',
          entityType: 'pay_run',
          entityId: payRunId,
          correlationId: 'corr-1',
        }),
      );
    });

    it('forbids non payroll-admin actors', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.exportPayRun(
          payRunId,
          {},
          { userId, tenantId: DIGITARO_TENANT_ID },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(payRunRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('listExportsForPayRun', () => {
    it('returns export batches for the pay run', async () => {
      const batches = [
        { id: 'batch-1', payRunId, fileFormat: ExportFileFormat.PDF },
      ];
      exportBatchRepository.find.mockResolvedValue(batches);

      const result = await service.listExportsForPayRun(payRunId, userId);

      expect(result).toEqual(batches);
      expect(exportBatchRepository.find).toHaveBeenCalledWith({
        where: { payRunId, tenantId: DIGITARO_TENANT_ID },
        order: { exportedAt: 'DESC' },
      });
    });

    it('throws when the pay run does not exist', async () => {
      payRunRepository.findOne.mockResolvedValue(null);

      await expect(
        service.listExportsForPayRun(payRunId, userId),
      ).rejects.toThrow('Pay run not found');
    });
  });
});
