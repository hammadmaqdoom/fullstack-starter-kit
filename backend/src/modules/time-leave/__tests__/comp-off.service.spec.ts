import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompOffService } from '../comp-off.service';
import { CompOffCreditEntity } from '../entities/comp-off-credit.entity';
import { CompOffCreditStatus } from '../enums/comp-off.enum';

describe('CompOffService', () => {
  let service: CompOffService;
  let creditRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let workerRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const managerId = 'w0000000-0000-4000-8000-000000000002';
  const userId = 'u0000000-0000-4000-8000-000000000001';
  const managerUserId = 'u0000000-0000-4000-8000-000000000002';

  const worker = {
    id: workerId,
    userId,
    tenantId: DIGITARO_TENANT_ID,
    managerId,
    divisionId: null,
  } as WorkerEntity;

  const manager = {
    id: managerId,
    userId: managerUserId,
    tenantId: DIGITARO_TENANT_ID,
    managerId: null,
    divisionId: null,
  } as WorkerEntity;

  beforeEach(async () => {
    creditRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => {
        if (Array.isArray(entity)) {
          return entity;
        }
        return {
          ...entity,
          id: entity.id ?? 'credit-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      find: jest.fn().mockResolvedValue([]),
    };

    workerRepository = {
      findOne: jest.fn(),
    };

    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompOffService,
        {
          provide: getRepositoryToken(CompOffCreditEntity),
          useValue: creditRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
      ],
    }).compile();

    service = module.get(CompOffService);
  });

  describe('grantCredit', () => {
    it("allows the worker's manager to grant a credit", async () => {
      workerRepository.findOne
        .mockResolvedValueOnce(worker) // getWorkerOrThrow(dto.workerId)
        .mockResolvedValueOnce(manager); // resolveActingWorkerId(manager userId)
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: managerUserId,
        roleCodes: [PolarisRoleCode.MANAGER],
        assignments: [],
        broadestScope: ScopeType.TEAM,
      });

      const result = await service.grantCredit(
        {
          workerId,
          creditedDays: 1,
          earnedDate: '2026-07-05',
          sourceReference: 'Weekend on-call coverage',
        },
        { userId: managerUserId, tenantId: DIGITARO_TENANT_ID },
      );

      expect(result.status).toBe(CompOffCreditStatus.ACTIVE);
      expect(result.grantedByWorkerId).toBe(managerId);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'comp_off_credit.grant' }),
      );
    });

    it('rejects a grant from someone who is not the manager or People Ops', async () => {
      const otherUserId = 'u0000000-0000-4000-8000-000000000099';
      const otherWorker = {
        id: 'w0000000-0000-4000-8000-000000000099',
        userId: otherUserId,
        tenantId: DIGITARO_TENANT_ID,
        managerId: null,
        divisionId: null,
      } as WorkerEntity;

      workerRepository.findOne
        .mockResolvedValueOnce(worker)
        .mockResolvedValueOnce(otherWorker);
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: otherUserId,
        roleCodes: [PolarisRoleCode.EMPLOYEE],
        assignments: [],
        broadestScope: ScopeType.OWN,
      });

      await expect(
        service.grantCredit(
          { workerId, creditedDays: 1, earnedDate: '2026-07-05' },
          { userId: otherUserId, tenantId: DIGITARO_TENANT_ID },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an expiryDate before earnedDate', async () => {
      workerRepository.findOne
        .mockResolvedValueOnce(worker)
        .mockResolvedValueOnce(manager);
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: managerUserId,
        roleCodes: [PolarisRoleCode.MANAGER],
        assignments: [],
        broadestScope: ScopeType.TEAM,
      });

      await expect(
        service.grantCredit(
          {
            workerId,
            creditedDays: 1,
            earnedDate: '2026-07-05',
            expiryDate: '2026-07-01',
          },
          { userId: managerUserId, tenantId: DIGITARO_TENANT_ID },
        ),
      ).rejects.toThrow('expiryDate cannot be before earnedDate');
    });
  });

  describe('getBalance', () => {
    it('sums credited/used/expired days for the acting worker', async () => {
      workerRepository.findOne.mockResolvedValueOnce(worker);
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId,
        roleCodes: [PolarisRoleCode.EMPLOYEE],
        assignments: [],
        broadestScope: ScopeType.OWN,
      });
      creditRepository.find.mockResolvedValue([
        {
          creditedDays: '1.00',
          status: CompOffCreditStatus.ACTIVE,
          expiryDate: null,
        },
        {
          creditedDays: '2.00',
          status: CompOffCreditStatus.USED,
          expiryDate: null,
        },
        {
          creditedDays: '0.50',
          status: CompOffCreditStatus.EXPIRED,
          expiryDate: '2026-01-01',
        },
      ]);

      const balance = await service.getBalance(
        userId,
        undefined,
        DIGITARO_TENANT_ID,
      );

      expect(balance).toEqual({
        workerId,
        availableDays: 1,
        usedDays: 2,
        expiredDays: 0.5,
      });
    });

    it('auto-expires active credits past their expiry date', async () => {
      workerRepository.findOne.mockResolvedValueOnce(worker);
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId,
        roleCodes: [PolarisRoleCode.EMPLOYEE],
        assignments: [],
        broadestScope: ScopeType.OWN,
      });
      const staleCredit = {
        id: 'credit-old',
        creditedDays: '1.00',
        status: CompOffCreditStatus.ACTIVE,
        expiryDate: '2020-01-01',
      };
      creditRepository.find
        .mockResolvedValueOnce([staleCredit]) // expireOutdatedCredits lookup
        .mockResolvedValueOnce([
          { ...staleCredit, status: CompOffCreditStatus.EXPIRED },
        ]);

      const balance = await service.getBalance(
        userId,
        undefined,
        DIGITARO_TENANT_ID,
      );

      expect(creditRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ status: CompOffCreditStatus.EXPIRED }),
      ]);
      expect(balance.availableDays).toBe(0);
      expect(balance.expiredDays).toBe(1);
    });
  });
});
