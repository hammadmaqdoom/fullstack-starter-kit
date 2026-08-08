import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { TeamsNotificationService } from '@/modules/automation/teams-notification.service';
import { CountryConfigService } from '@/modules/country-config/country-config.service';
import { HolidayEntity } from '@/modules/country-config/entities/holiday.entity';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { ApprovalDelegationEntity } from '@/modules/core-hr/entities/approval-delegation.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaveBalanceEntity } from '../entities/leave-balance.entity';
import { LeaveRequestEntity } from '../entities/leave-request.entity';
import { LeaveRequestStatus } from '../enums/leave.enum';
import { LeaveService } from '../leave.service';

describe('LeaveService', () => {
  let service: LeaveService;
  let leaveRequestRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let leaveBalanceRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let leaveTypeRepository: { findOne: jest.Mock };
  let workerRepository: { findOne: jest.Mock };
  let delegationRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let countryConfigService: { resolveEmploymentTypeCountryRules: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };
  let teamsNotificationService: { enqueueLeaveApprovalPending: jest.Mock };

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const managerId = 'w0000000-0000-4000-8000-000000000002';
  const userId = 'u0000000-0000-4000-8000-000000000001';
  const managerUserId = 'u0000000-0000-4000-8000-000000000002';
  const leaveTypeId = 'lt000000-0000-4000-8000-000000000001';

  const worker = {
    id: workerId,
    userId,
    tenantId: DIGITARO_TENANT_ID,
    managerId,
    divisionId: null,
    countryCode: 'PK',
    employmentTypeId: 'et-1',
  } as WorkerEntity;

  beforeEach(async () => {
    leaveRequestRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? 'lr-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findOne: jest.fn(),
    };

    leaveBalanceRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'bal-1',
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        leaveTypeId,
        year: 2026,
        entitled: '20.00',
        used: '2.00',
        pending: '0.00',
      }),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
    };

    leaveTypeRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: leaveTypeId,
        tenantId: DIGITARO_TENANT_ID,
        countryCode: 'PK',
        code: 'ANNUAL',
        name: 'Annual Leave',
      } as LeaveTypeEntity),
    };

    workerRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where?.userId === userId || where?.id === workerId) {
          return worker;
        }
        if (where?.userId === managerUserId || where?.id === managerId) {
          return {
            id: managerId,
            userId: managerUserId,
            tenantId: DIGITARO_TENANT_ID,
            managerId: null,
            divisionId: null,
          } as WorkerEntity;
        }
        return null;
      }),
    };

    delegationRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    auditLogService = { append: jest.fn() };
    countryConfigService = {
      resolveEmploymentTypeCountryRules: jest.fn().mockResolvedValue({
        leaveEnabled: true,
      }),
    };
    teamsNotificationService = { enqueueLeaveApprovalPending: jest.fn() };
    rbacService = {
      getAuthContext: jest.fn().mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: managerUserId,
        roleCodes: [PolarisRoleCode.MANAGER],
        assignments: [
          {
            roleId: 'role-1',
            roleCode: PolarisRoleCode.MANAGER,
            scopeType: ScopeType.TEAM,
            scopeId: null,
          },
        ],
        broadestScope: ScopeType.TEAM,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        {
          provide: getRepositoryToken(LeaveRequestEntity),
          useValue: leaveRequestRepository,
        },
        {
          provide: getRepositoryToken(LeaveBalanceEntity),
          useValue: leaveBalanceRepository,
        },
        {
          provide: getRepositoryToken(LeaveTypeEntity),
          useValue: leaveTypeRepository,
        },
        {
          provide: getRepositoryToken(HolidayEntity),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        {
          provide: getRepositoryToken(ApprovalDelegationEntity),
          useValue: delegationRepository,
        },
        { provide: CountryConfigService, useValue: countryConfigService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
        {
          provide: TeamsNotificationService,
          useValue: teamsNotificationService,
        },
      ],
    }).compile();

    service = module.get(LeaveService);
  });

  it('creates leave request, sets pending balance, and audits', async () => {
    const result = await service.createRequest(
      {
        leaveTypeId,
        startDate: '2026-08-01',
        endDate: '2026-08-02',
        days: 2,
        reason: 'Family event',
      },
      { userId, correlationId: 'corr-leave-1' },
    );

    expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
    expect(result.managerId).toBe(managerId);
    expect(leaveBalanceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ pending: '2.00' }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'leave.request.create',
        correlationId: 'corr-leave-1',
      }),
    );
  });

  it('rejects create when balance is insufficient', async () => {
    leaveBalanceRepository.findOne.mockResolvedValue({
      id: 'bal-1',
      entitled: '2.00',
      used: '1.00',
      pending: '1.00',
    });

    await expect(
      service.createRequest(
        {
          leaveTypeId,
          startDate: '2026-08-01',
          endDate: '2026-08-05',
          days: 5,
        },
        { userId },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves leave and moves pending into used', async () => {
    leaveRequestRepository.findOne.mockResolvedValue({
      id: 'lr-1',
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      leaveTypeId,
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      days: '2.00',
      status: LeaveRequestStatus.SUBMITTED,
      managerId,
      approverId: null,
      reason: null,
    } as LeaveRequestEntity);

    leaveBalanceRepository.findOne.mockResolvedValue({
      id: 'bal-1',
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      leaveTypeId,
      year: 2026,
      entitled: '20.00',
      used: '2.00',
      pending: '2.00',
    });

    const result = await service.approveRequest('lr-1', {
      userId: managerUserId,
      correlationId: 'corr-approve',
    });

    expect(result.status).toBe(LeaveRequestStatus.APPROVED);
    expect(leaveBalanceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        pending: '0.00',
        used: '4.00',
      }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'leave.request.approve',
      }),
    );
  });
});
