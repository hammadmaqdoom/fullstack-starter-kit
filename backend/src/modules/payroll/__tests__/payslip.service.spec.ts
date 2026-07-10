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
import { QueryPayslipsDto } from '../dto/payslip.dto';
import { PayRunLineItemEntity } from '../entities/pay-run-line-item.entity';
import { PayRunEntity } from '../entities/pay-run.entity';
import { PayslipEntity } from '../entities/payslip.entity';
import { PayRunStatus, PayslipStatus } from '../enums/payroll.enum';
import { PayslipBlobStorageService } from '../payslip-blob-storage.service';
import { PayslipPdfService } from '../payslip-pdf.service';
import { PayslipService } from '../payslip.service';

describe('PayslipService', () => {
  let service: PayslipService;
  let payslipRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let payRunRepository: { findOne: jest.Mock };
  let lineItemRepository: { find: jest.Mock };
  let workerRepository: { findOne: jest.Mock };
  let legalEntityRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };
  let pdfService: { render: jest.Mock };
  let blobStorageService: { upload: jest.Mock };

  const userId = 'u0000000-0000-4000-8000-000000000001';
  const legalEntityId = 'le000000-0000-4000-8000-000000000001';
  const payRunId = 'pr000000-0000-4000-8000-000000000001';
  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const otherWorkerId = 'w0000000-0000-4000-8000-000000000002';
  const payslipId = 'ps000000-0000-4000-8000-000000000001';

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
      id: `li00000-0000-4000-8000-00000000000${Math.random()}`,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      payRunId,
      workerId,
      grossPay: '120000.00',
      totalDeductions: '20000.00',
      netPay: '100000.00',
      currencyCode: 'PKR',
      ...overrides,
    }) as PayRunLineItemEntity;

  const buildPayslip = (
    overrides: Partial<PayslipEntity> = {},
  ): PayslipEntity =>
    ({
      id: payslipId,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      payRunLineItemId: 'li0-1',
      workerId,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      netPay: '100000.00',
      currencyCode: 'PKR',
      pdfBlobUrl: null,
      releasedAt: null,
      status: PayslipStatus.DRAFT,
      ...overrides,
    }) as PayslipEntity;

  function mockQueryBuilder<T>(items: T[]) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([items, items.length]),
    };
  }

  beforeEach(async () => {
    payslipRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? payslipId,
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: new Date(),
      })),
      createQueryBuilder: jest.fn(),
    };

    payRunRepository = { findOne: jest.fn().mockResolvedValue(buildPayRun()) };
    lineItemRepository = {
      find: jest.fn().mockResolvedValue([buildLineItem(), buildLineItem()]),
    };
    workerRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: workerId,
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    };
    legalEntityRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: legalEntityId,
        registeredName: 'Digitaro Labs (Private) Limited',
      } as LegalEntityEntity),
    };
    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn().mockResolvedValue(financeAuth) };
    pdfService = { render: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    blobStorageService = {
      upload: jest.fn().mockResolvedValue('https://blob/payslips/x.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayslipService,
        {
          provide: getRepositoryToken(PayslipEntity),
          useValue: payslipRepository,
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
        { provide: PayslipPdfService, useValue: pdfService },
        { provide: PayslipBlobStorageService, useValue: blobStorageService },
      ],
    }).compile();

    service = module.get(PayslipService);
  });

  describe('releasePayslips', () => {
    it('creates one payslip per line item from an approved pay run', async () => {
      const result = await service.releasePayslips(payRunId, { userId });

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === PayslipStatus.RELEASED)).toBe(
        true,
      );
      expect(
        result.every((p) => p.pdfBlobUrl === 'https://blob/payslips/x.pdf'),
      ).toBe(true);
      expect(blobStorageService.upload).toHaveBeenCalledTimes(2);
      expect(pdfService.render).toHaveBeenCalledTimes(2);
    });

    it('writes an audit_log entry on release', async () => {
      await service.releasePayslips(payRunId, {
        userId,
        correlationId: 'corr-ps-1',
      });

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.payslip.release',
          entityType: 'pay_run',
          entityId: payRunId,
          correlationId: 'corr-ps-1',
          changes: expect.objectContaining({
            payslipCount: { old: null, new: 2 },
          }),
        }),
      );
    });

    it('throws BadRequestException when releasing from a non-approved (draft) pay run', async () => {
      payRunRepository.findOne.mockResolvedValue(
        buildPayRun({ status: PayRunStatus.DRAFT }),
      );

      await expect(
        service.releasePayslips(payRunId, { userId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(payslipRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the actor is not a payroll admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);

      await expect(
        service.releasePayslips(payRunId, { userId }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(payslipRepository.save).not.toHaveBeenCalled();
    });

    it('skips line items that already have a released payslip (idempotent re-release)', async () => {
      const lineItems = [
        buildLineItem({ id: 'li0-1' }),
        buildLineItem({ id: 'li0-2' }),
      ];
      lineItemRepository.find.mockResolvedValue(lineItems);
      payslipRepository.find.mockResolvedValue([
        buildPayslip({ payRunLineItemId: 'li0-1' }),
      ]);

      const result = await service.releasePayslips(payRunId, { userId });

      expect(result).toHaveLength(1);
      expect(blobStorageService.upload).toHaveBeenCalledTimes(1);
    });
  });

  describe('listPayslips', () => {
    it('scopes a non-admin (employee) actor to their own payslips only', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      workerRepository.findOne.mockResolvedValue({ id: workerId });
      const qb = mockQueryBuilder([buildPayslip()]);
      payslipRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listPayslips({} as QueryPayslipsDto, userId);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'payslip.workerId = :targetWorkerId',
        { targetWorkerId: workerId },
      );
      expect(result.items).toHaveLength(1);
    });

    it('rejects an employee explicitly requesting another workerId', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      workerRepository.findOne.mockResolvedValue({ id: workerId });

      await expect(
        service.listPayslips(
          { workerId: otherWorkerId } as QueryPayslipsDto,
          userId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows Finance to filter by any workerId', async () => {
      const qb = mockQueryBuilder([buildPayslip({ workerId: otherWorkerId })]);
      payslipRepository.createQueryBuilder.mockReturnValue(qb);

      await service.listPayslips(
        { workerId: otherWorkerId } as QueryPayslipsDto,
        userId,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'payslip.workerId = :targetWorkerId',
        { targetWorkerId: otherWorkerId },
      );
    });
  });

  describe('downloadPayslip', () => {
    it('blocks download for a draft (unreleased) payslip when the actor is an employee', async () => {
      payslipRepository.findOne.mockResolvedValue(
        buildPayslip({ status: PayslipStatus.DRAFT, workerId }),
      );
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      workerRepository.findOne.mockResolvedValue({ id: workerId });

      await expect(
        service.downloadPayslip(payslipId, userId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows download of a released payslip owned by the requesting employee', async () => {
      payslipRepository.findOne.mockResolvedValue(
        buildPayslip({
          status: PayslipStatus.RELEASED,
          workerId,
          pdfBlobUrl: 'https://blob/payslips/ps.pdf',
        }),
      );
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      workerRepository.findOne.mockResolvedValue({ id: workerId });

      const result = await service.downloadPayslip(payslipId, userId);

      expect(result).toEqual({
        payslipId,
        pdfBlobUrl: 'https://blob/payslips/ps.pdf',
      });
    });

    it('rejects an employee downloading another workers payslip', async () => {
      payslipRepository.findOne.mockResolvedValue(
        buildPayslip({
          status: PayslipStatus.RELEASED,
          workerId: otherWorkerId,
        }),
      );
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      workerRepository.findOne.mockResolvedValue({ id: workerId });

      await expect(
        service.downloadPayslip(payslipId, userId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
