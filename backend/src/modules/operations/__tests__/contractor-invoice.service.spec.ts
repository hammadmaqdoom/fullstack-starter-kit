import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ContractorInvoiceService } from '@/modules/operations/contractor-invoice.service';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
import { ContractorInvoiceStatus } from '@/modules/operations/enums/contractor-invoice.enum';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

describe('ContractorInvoiceService', () => {
  let service: ContractorInvoiceService;
  let invoiceRepository: jest.Mocked<
    Pick<
      Repository<ContractorInvoiceEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder'
    >
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;
  let transactionManager: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  const contractorWorkerId = 'w0000000-0000-4000-8000-000000000010';
  const managerWorkerId = 'w0000000-0000-4000-8000-000000000011';
  const otherWorkerId = 'w0000000-0000-4000-8000-000000000012';
  const legalEntityId = 'e0000000-0000-4000-8000-000000000001';

  const contractorAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'contractor-user',
    roleCodes: [PolarisRoleCode.CONTRACTOR],
    assignments: [
      {
        roleId: 'role-contractor',
        roleCode: PolarisRoleCode.CONTRACTOR,
        scopeType: ScopeType.OWN,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.OWN,
  };

  const managerAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'manager-user',
    roleCodes: [PolarisRoleCode.MANAGER],
    assignments: [
      {
        roleId: 'role-manager',
        roleCode: PolarisRoleCode.MANAGER,
        scopeType: ScopeType.TEAM,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.TEAM,
  };

  const financeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'finance-user',
    roleCodes: [PolarisRoleCode.FINANCE],
    assignments: [
      {
        roleId: 'role-finance',
        roleCode: PolarisRoleCode.FINANCE,
        scopeType: ScopeType.ALL,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.ALL,
  };

  const lineItemDto = {
    description: 'Backend development — Sprint 42',
    quantity: 10,
    unitPrice: 150,
    amount: 1500,
  };

  const buildInvoice = (
    overrides: Partial<ContractorInvoiceEntity> = {},
  ): ContractorInvoiceEntity =>
    ({
      id: 'invoice-1',
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      workerId: contractorWorkerId,
      invoiceNumber: 'INV-0001',
      invoiceDate: '2026-07-01',
      dueDate: '2026-07-15',
      servicePeriodFrom: null,
      servicePeriodTo: null,
      currencyCode: 'USD',
      grossAmount: '1500.00',
      taxAmount: null,
      status: ContractorInvoiceStatus.DRAFT,
      pdfBlobUrl: 'blob://invoice-1.pdf',
      rejectionReason: null,
      managerApprovedBy: null,
      managerApprovedAt: null,
      financeApprovedBy: null,
      financeApprovedAt: null,
      ...overrides,
    }) as ContractorInvoiceEntity;

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    } as unknown as SelectQueryBuilder<ContractorInvoiceEntity>;

    invoiceRepository = {
      create: jest.fn((entity) => entity as ContractorInvoiceEntity),
      save: jest.fn(async (entity) => entity as ContractorInvoiceEntity),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as typeof invoiceRepository;

    workerRepository = {
      findOne: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) => {
          if ('userId' in where) {
            const userId = where.userId as string;
            if (userId === 'contractor-user') {
              return { id: contractorWorkerId } as WorkerEntity;
            }
            if (userId === 'manager-user') {
              return { id: managerWorkerId } as WorkerEntity;
            }
            return null;
          }
          if (where.id === contractorWorkerId) {
            return {
              id: contractorWorkerId,
              managerId: managerWorkerId,
            } as WorkerEntity;
          }
          return { id: where.id } as WorkerEntity;
        },
      ),
    };

    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(contractorAuth);

    transactionManager = {
      create: jest.fn((_entityClass: unknown, plain: unknown) => plain),
      save: jest.fn(async (entityOrArray: unknown) => {
        if (Array.isArray(entityOrArray)) {
          return entityOrArray.map((line, index) => ({
            ...(line as object),
            id: `line-${index}`,
          }));
        }
        return { ...(entityOrArray as object), id: 'invoice-1' };
      }),
      delete: jest.fn(),
    };

    const dataSource = {
      transaction: jest.fn(async (cb: (manager: EntityManager) => unknown) =>
        cb(transactionManager as unknown as EntityManager),
      ),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractorInvoiceService,
        {
          provide: getRepositoryToken(ContractorInvoiceEntity),
          useValue: invoiceRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ContractorInvoiceService);
  });

  describe('create', () => {
    it('creates a draft invoice with a computed gross amount and writes an audit log entry', async () => {
      const result = await service.create(
        {
          legalEntityId,
          invoiceNumber: 'INV-0001',
          invoiceDate: '2026-07-01',
          dueDate: '2026-07-15',
          currencyCode: 'usd',
          lineItems: [lineItemDto],
        },
        'contractor-user',
        'corr-1',
      );

      expect(result.id).toBe('invoice-1');
      expect(result.status).toBe(ContractorInvoiceStatus.DRAFT);
      expect(result.workerId).toBe(contractorWorkerId);
      expect(result.grossAmount).toBe('1500.00');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractor_invoice.create',
          entityType: 'contractor_invoice',
          correlationId: 'corr-1',
        }),
      );
    });

    it('blocks a duplicate invoice number for the same tenant', async () => {
      const qb = invoiceRepository.createQueryBuilder(
        'invoice',
      ) as unknown as jest.Mocked<SelectQueryBuilder<ContractorInvoiceEntity>>;
      (qb.getOne as jest.Mock).mockResolvedValue(buildInvoice());

      await expect(
        service.create(
          {
            legalEntityId,
            invoiceNumber: 'INV-0001',
            invoiceDate: '2026-07-01',
            dueDate: '2026-07-15',
            currencyCode: 'USD',
            lineItems: [lineItemDto],
          },
          'contractor-user',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a contractor creating an invoice for another worker', async () => {
      await expect(
        service.create(
          {
            legalEntityId,
            workerId: otherWorkerId,
            invoiceNumber: 'INV-0002',
            invoiceDate: '2026-07-01',
            dueDate: '2026-07-15',
            currencyCode: 'USD',
            lineItems: [lineItemDto],
          },
          'contractor-user',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('submit', () => {
    it('moves a draft invoice with a PDF attached to submitted', async () => {
      invoiceRepository.findOne.mockResolvedValue(buildInvoice());

      const result = await service.submit(
        'invoice-1',
        'contractor-user',
        'corr-2',
      );

      expect(result.status).toBe(ContractorInvoiceStatus.SUBMITTED);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractor_invoice.submit',
          changes: expect.objectContaining({
            status: {
              old: ContractorInvoiceStatus.DRAFT,
              new: ContractorInvoiceStatus.SUBMITTED,
            },
          }),
        }),
      );
    });

    it('rejects submitting without a PDF attachment', async () => {
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ pdfBlobUrl: null }),
      );

      await expect(
        service.submit('invoice-1', 'contractor-user'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects submitting an invoice that is not a draft', async () => {
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.SUBMITTED }),
      );

      await expect(
        service.submit('invoice-1', 'contractor-user'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('approveManager', () => {
    it("moves a submitted invoice to manager_approved for the worker's manager", async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.SUBMITTED }),
      );

      const result = await service.approveManager(
        'invoice-1',
        'manager-user',
        'corr-3',
      );

      expect(result.status).toBe(ContractorInvoiceStatus.MANAGER_APPROVED);
      expect(result.managerApprovedBy).toBe('manager-user');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractor_invoice.approve_manager',
        }),
      );
    });

    it('allows Finance/People Ops to manager-approve for Wave 2 MVP', async () => {
      getAuthContext.mockResolvedValue(financeAuth);
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.SUBMITTED }),
      );

      const result = await service.approveManager('invoice-1', 'finance-user');

      expect(result.status).toBe(ContractorInvoiceStatus.MANAGER_APPROVED);
    });

    it('rejects a manager who does not manage the invoice worker', async () => {
      getAuthContext.mockResolvedValue({
        ...managerAuth,
        userId: 'other-manager',
      });
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.SUBMITTED }),
      );

      await expect(
        service.approveManager('invoice-1', 'other-manager'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('approveFinance', () => {
    it('moves a manager_approved invoice to finance_approved for Finance', async () => {
      getAuthContext.mockResolvedValue(financeAuth);
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.MANAGER_APPROVED }),
      );

      const result = await service.approveFinance(
        'invoice-1',
        'finance-user',
        'corr-4',
      );

      expect(result.status).toBe(ContractorInvoiceStatus.FINANCE_APPROVED);
      expect(result.financeApprovedBy).toBe('finance-user');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contractor_invoice.approve_finance',
        }),
      );
    });

    it('rejects a manager attempting to finance-approve', async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.MANAGER_APPROVED }),
      );

      await expect(
        service.approveFinance('invoice-1', 'manager-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects finance-approving an invoice still awaiting manager approval', async () => {
      getAuthContext.mockResolvedValue(financeAuth);
      invoiceRepository.findOne.mockResolvedValue(
        buildInvoice({ status: ContractorInvoiceStatus.SUBMITTED }),
      );

      await expect(
        service.approveFinance('invoice-1', 'finance-user'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it("prevents a contractor from listing another worker's invoices", async () => {
      await expect(
        service.list({ workerId: otherWorkerId } as never, 'contractor-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('scopes a contractor to their own invoices when no workerId filter is given', async () => {
      const qb = invoiceRepository.createQueryBuilder(
        'invoice',
      ) as unknown as jest.Mocked<SelectQueryBuilder<ContractorInvoiceEntity>>;

      await service.list({} as never, 'contractor-user');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'invoice.workerId = :actingWorkerId',
        { actingWorkerId: contractorWorkerId },
      );
    });

    it('allows Finance to list any workerId', async () => {
      getAuthContext.mockResolvedValue(financeAuth);
      const qb = invoiceRepository.createQueryBuilder(
        'invoice',
      ) as unknown as jest.Mocked<SelectQueryBuilder<ContractorInvoiceEntity>>;

      await service.list({ workerId: otherWorkerId } as never, 'finance-user');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'invoice.workerId = :targetWorkerId',
        { targetWorkerId: otherWorkerId },
      );
    });
  });

  describe('ocrPrefill', () => {
    it('returns an empty prefill stub (no OCR provider wired up)', () => {
      expect(service.ocrPrefill()).toEqual({});
    });
  });
});
