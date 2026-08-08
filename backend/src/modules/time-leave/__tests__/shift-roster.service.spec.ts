import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ShiftAssignmentEntity } from '../entities/shift-assignment.entity';
import { ShiftRosterEntity } from '../entities/shift-roster.entity';
import { LeaveRequestEntity } from '../entities/leave-request.entity';
import { LeaveRequestStatus } from '../enums/leave.enum';
import { ShiftType } from '../enums/shift-roster.enum';
import type {
  QueryShiftAssignmentsDto,
  QueryShiftRostersDto,
} from '../dto/shift-roster.dto';
import { ShiftRosterService } from '../shift-roster.service';

function createQueryBuilderMock(result: [unknown[], number]) {
  const qb: Record<string, jest.Mock> = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    innerJoinAndSelect: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  Object.keys(qb).forEach((key) => {
    if (key !== 'getManyAndCount') {
      qb[key].mockReturnValue(qb);
    }
  });
  return qb;
}

describe('ShiftRosterService', () => {
  let service: ShiftRosterService;
  let rosterRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let assignmentRepository: { createQueryBuilder: jest.Mock };
  let leaveRequestRepository: { find: jest.Mock };
  let workerRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const tenantId = DIGITARO_TENANT_ID;
  const managerUserId = 'u0000000-0000-4000-8000-000000000001';
  const managerWorkerId = 'w0000000-0000-4000-8000-000000000001';
  const reportWorkerId = 'w0000000-0000-4000-8000-000000000002';
  const outsideWorkerId = 'w0000000-0000-4000-8000-000000000003';
  const rosterId = 'ro000000-0000-4000-8000-000000000001';

  const managerAuth = {
    tenantId,
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
  };

  const peopleOpsAuth = {
    tenantId,
    userId: 'u-people-ops',
    roleCodes: [PolarisRoleCode.PEOPLE_OPS],
    assignments: [
      {
        roleId: 'role-2',
        roleCode: PolarisRoleCode.PEOPLE_OPS,
        scopeType: ScopeType.ALL,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.ALL,
  };

  beforeEach(async () => {
    rosterRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? rosterId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findOne: jest.fn(),
      remove: jest.fn(async (entity) => entity),
      createQueryBuilder: jest.fn(),
    };

    assignmentRepository = { createQueryBuilder: jest.fn() };
    leaveRequestRepository = { find: jest.fn().mockResolvedValue([]) };

    workerRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where?.userId === managerUserId || where?.id === managerWorkerId) {
          return {
            id: managerWorkerId,
            userId: managerUserId,
            tenantId,
            managerId: null,
            divisionId: null,
          } as WorkerEntity;
        }
        if (where?.id === reportWorkerId) {
          return {
            id: reportWorkerId,
            userId: 'u-report',
            tenantId,
            managerId: managerWorkerId,
            divisionId: null,
          } as WorkerEntity;
        }
        if (where?.id === outsideWorkerId) {
          return {
            id: outsideWorkerId,
            userId: 'u-outside',
            tenantId,
            managerId: 'someone-else',
            divisionId: null,
          } as WorkerEntity;
        }
        return null;
      }),
    };

    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn().mockResolvedValue(managerAuth) };
    dataSource = {
      transaction: jest.fn(async (cb) =>
        cb({
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn((_entity, data) => data),
          save: jest.fn(async (_entity, data) => ({
            ...data,
            id: data.id ?? 'assignment-1',
          })),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftRosterService,
        { provide: getRepositoryToken(ShiftRosterEntity), useValue: rosterRepository },
        {
          provide: getRepositoryToken(ShiftAssignmentEntity),
          useValue: assignmentRepository,
        },
        {
          provide: getRepositoryToken(LeaveRequestEntity),
          useValue: leaveRequestRepository,
        },
        { provide: getRepositoryToken(WorkerEntity), useValue: workerRepository },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ShiftRosterService);
  });

  describe('createRoster', () => {
    it('creates a roster and audits for a manager', async () => {
      const result = await service.createRoster(
        { name: 'Week 32 Roster', effectiveFrom: '2026-08-03', effectiveTo: '2026-08-09' },
        { userId: managerUserId, tenantId, correlationId: 'corr-1' },
      );

      expect(result.name).toBe('Week 32 Roster');
      expect(result.createdBy).toBe(managerWorkerId);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'shift_roster.create', correlationId: 'corr-1' }),
      );
    });

    it('rejects effectiveTo before effectiveFrom', async () => {
      await expect(
        service.createRoster(
          { name: 'Bad Roster', effectiveFrom: '2026-08-09', effectiveTo: '2026-08-03' },
          { userId: managerUserId, tenantId },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when actor lacks publisher role', async () => {
      rbacService.getAuthContext.mockResolvedValue({
        ...managerAuth,
        roleCodes: [PolarisRoleCode.EMPLOYEE],
      });

      await expect(
        service.createRoster(
          { name: 'Week 33', effectiveFrom: '2026-08-10' },
          { userId: managerUserId, tenantId },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('deleteRoster', () => {
    it('blocks deletion when assignments exist', async () => {
      rosterRepository.findOne.mockResolvedValue({
        id: rosterId,
        tenantId,
        name: 'Week 32',
        assignments: [{ id: 'a-1' }],
      });

      await expect(
        service.deleteRoster(rosterId, { userId: managerUserId, tenantId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(rosterRepository.remove).not.toHaveBeenCalled();
    });

    it('deletes and audits when no assignments exist', async () => {
      rosterRepository.findOne.mockResolvedValue({
        id: rosterId,
        tenantId,
        name: 'Week 32',
        assignments: [],
      });

      await service.deleteRoster(rosterId, { userId: managerUserId, tenantId });

      expect(rosterRepository.remove).toHaveBeenCalled();
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'shift_roster.delete' }),
      );
    });

    it('throws NotFoundException for unknown roster', async () => {
      rosterRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteRoster('missing-id', { userId: managerUserId, tenantId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('publishAssignments', () => {
    beforeEach(() => {
      rosterRepository.findOne.mockResolvedValue({
        id: rosterId,
        tenantId,
        name: 'Week 32',
      });
    });

    it('publishes assignments for a direct report and audits', async () => {
      const { assignments, conflicts } = await service.publishAssignments(
        rosterId,
        {
          assignments: [
            {
              workerId: reportWorkerId,
              shiftDate: '2026-08-04',
              shiftType: ShiftType.MORNING,
              startTime: '09:00',
              endTime: '17:00',
            },
          ],
        },
        { userId: managerUserId, tenantId, correlationId: 'corr-pub' },
      );

      expect(conflicts).toHaveLength(0);
      expect(assignments).toHaveLength(1);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'shift_roster.assignments.publish' }),
      );
    });

    it('blocks publishing for a worker outside the manager scope', async () => {
      await expect(
        service.publishAssignments(
          rosterId,
          {
            assignments: [
              {
                workerId: outsideWorkerId,
                shiftDate: '2026-08-04',
                shiftType: ShiftType.MORNING,
                startTime: '09:00',
                endTime: '17:00',
              },
            ],
          },
          { userId: managerUserId, tenantId },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('blocks publishing on approved-leave conflict unless forced', async () => {
      leaveRequestRepository.find.mockResolvedValue([
        {
          id: 'leave-1',
          tenantId,
          workerId: reportWorkerId,
          startDate: '2026-08-04',
          endDate: '2026-08-05',
          status: LeaveRequestStatus.APPROVED,
        },
      ]);

      await expect(
        service.publishAssignments(
          rosterId,
          {
            assignments: [
              {
                workerId: reportWorkerId,
                shiftDate: '2026-08-04',
                shiftType: ShiftType.MORNING,
                startTime: '09:00',
                endTime: '17:00',
              },
            ],
          },
          { userId: managerUserId, tenantId },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows forced publish despite conflicts and records conflict count', async () => {
      leaveRequestRepository.find.mockResolvedValue([
        {
          id: 'leave-1',
          tenantId,
          workerId: reportWorkerId,
          startDate: '2026-08-04',
          endDate: '2026-08-05',
          status: LeaveRequestStatus.APPROVED,
        },
      ]);

      const { conflicts } = await service.publishAssignments(
        rosterId,
        {
          assignments: [
            {
              workerId: reportWorkerId,
              shiftDate: '2026-08-04',
              shiftType: ShiftType.MORNING,
              startTime: '09:00',
              endTime: '17:00',
            },
          ],
          force: true,
        },
        { userId: managerUserId, tenantId },
      );

      expect(conflicts).toHaveLength(1);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.objectContaining({
            conflictCount: { old: null, new: 1 },
            forced: { old: null, new: true },
          }),
        }),
      );
    });
  });

  describe('listRosters / listAssignments (people ops sees all)', () => {
    it('lists rosters without extra scope filtering for people ops', async () => {
      rbacService.getAuthContext.mockResolvedValue(peopleOpsAuth);
      const qb = createQueryBuilderMock([[{ id: rosterId }], 1]);
      rosterRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listRosters(
        {} as QueryShiftRostersDto,
        'u-people-ops',
        tenantId,
      );

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('lists assignments scoped to a specific worker with access check', async () => {
      const qb = createQueryBuilderMock([[{ id: 'a-1' }], 1]);
      assignmentRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listAssignments(
        {
          from: '2026-08-01',
          to: '2026-08-07',
          workerId: reportWorkerId,
        } as QueryShiftAssignmentsDto,
        managerUserId,
        tenantId,
      );

      expect(result.items).toHaveLength(1);
    });

    it('rejects listing assignments for a worker outside scope', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      assignmentRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.listAssignments(
          {
            from: '2026-08-01',
            to: '2026-08-07',
            workerId: outsideWorkerId,
          } as QueryShiftAssignmentsDto,
          managerUserId,
          tenantId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
