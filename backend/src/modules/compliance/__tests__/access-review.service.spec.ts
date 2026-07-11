import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { AccessReviewService } from '../access-review.service';
import { AuditLogService } from '../audit-log.service';
import { DIGITARO_TENANT_ID } from '../constants/tenant.constants';
import { AccessReviewCycleEntity } from '../entities/access-review-cycle.entity';
import { AccessReviewItemEntity } from '../entities/access-review-item.entity';
import { UserRoleAssignmentEntity } from '../entities/user-role-assignment.entity';
import {
  AccessReviewCycleStatus,
  AccessReviewItemStatus,
} from '../enums/access-review.enum';
import { PolarisRoleCode } from '../enums/polaris-role-code.enum';
import { ScopeType } from '../enums/scope-type.enum';
import { RbacService } from '../rbac.service';

describe('AccessReviewService', () => {
  let service: AccessReviewService;
  let cycleRepository: jest.Mocked<
    Pick<Repository<AccessReviewCycleEntity>, 'create' | 'save' | 'findOne' | 'find'>
  >;
  let itemRepository: jest.Mocked<
    Pick<
      Repository<AccessReviewItemEntity>,
      'create' | 'save' | 'findOne' | 'find' | 'createQueryBuilder'
    >
  >;
  let assignmentRepository: jest.Mocked<
    Pick<Repository<UserRoleAssignmentEntity>, 'createQueryBuilder' | 'findOne' | 'save'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let rbacService: jest.Mocked<Pick<RbacService, 'getAuthContext'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  const managerWorkerId = 'w0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    cycleRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: 'cycle-1',
        openedAt: new Date(),
      })),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as typeof cycleRepository;

    itemRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as typeof itemRepository;

    assignmentRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
    } as unknown as typeof assignmentRepository;

    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn() };
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessReviewService,
        { provide: getRepositoryToken(AccessReviewCycleEntity), useValue: cycleRepository },
        { provide: getRepositoryToken(AccessReviewItemEntity), useValue: itemRepository },
        { provide: getRepositoryToken(UserRoleAssignmentEntity), useValue: assignmentRepository },
        { provide: RbacService, useValue: rbacService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AccessReviewService);
  });

  describe('openCycle', () => {
    it('snapshots active role assignments into pending items and audits the cycle', async () => {
      const assignmentQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'assignment-1',
            userId: 'user-1',
            user: { email: 'hrbp@digitaro.com' },
            role: { code: PolarisRoleCode.HRBP },
            scopeType: ScopeType.COUNTRY,
            scopeId: null,
            scopeCountryCode: 'PK',
          },
        ]),
      } as unknown as SelectQueryBuilder<UserRoleAssignmentEntity>;
      assignmentRepository.createQueryBuilder.mockReturnValue(assignmentQb);
      dataSource.query.mockResolvedValue([
        { id: 'worker-1', userId: 'user-1', managerId: managerWorkerId },
      ]);

      const cycle = await service.openCycle(
        { periodLabel: '2026-Q3' },
        'admin-user',
      );

      expect(cycle.id).toBe('cycle-1');
      expect(itemRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'user-1',
          workerId: 'worker-1',
          managerWorkerId,
          roleCode: PolarisRoleCode.HRBP,
          status: AccessReviewItemStatus.PENDING,
        }),
      ]);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'access_review_cycle.open' }),
      );
    });
  });

  describe('listItems', () => {
    it('restricts a manager to items where they are the assignee manager', async () => {
      cycleRepository.findOne.mockResolvedValue({
        id: 'cycle-1',
        tenantId: DIGITARO_TENANT_ID,
        status: AccessReviewCycleStatus.OPEN,
      } as AccessReviewCycleEntity);
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: 'manager-user',
        roleCodes: [PolarisRoleCode.MANAGER],
        assignments: [],
        broadestScope: ScopeType.TEAM,
      });
      dataSource.query.mockResolvedValue([{ id: managerWorkerId }]);
      const itemsQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as unknown as SelectQueryBuilder<AccessReviewItemEntity>;
      itemRepository.createQueryBuilder.mockReturnValue(itemsQb);

      await service.listItems('cycle-1', 'manager-user');

      expect(itemsQb.andWhere).toHaveBeenCalledWith(
        'item.managerWorkerId = :actingWorkerId',
        { actingWorkerId: managerWorkerId },
      );
    });
  });

  describe('revokeItem', () => {
    it('revoking an item also ends the underlying role assignment', async () => {
      itemRepository.findOne.mockResolvedValue({
        id: 'item-1',
        tenantId: DIGITARO_TENANT_ID,
        assignmentId: 'assignment-1',
        status: AccessReviewItemStatus.PENDING,
        managerWorkerId: null,
      } as AccessReviewItemEntity);
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: 'admin-user',
        roleCodes: [PolarisRoleCode.IT_ADMIN],
        assignments: [],
        broadestScope: ScopeType.ALL,
      });
      assignmentRepository.findOne.mockResolvedValue({
        id: 'assignment-1',
        tenantId: DIGITARO_TENANT_ID,
        effectiveTo: null,
      } as UserRoleAssignmentEntity);

      const result = await service.revokeItem('item-1', 'admin-user', 'no longer needed');

      expect(result.status).toBe(AccessReviewItemStatus.REVOKED);
      expect(assignmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ effectiveTo: expect.any(String) }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user_role_assignment.revoke' }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'access_review_item.revoke' }),
      );
    });

    it('forbids a manager from revoking an item outside their team', async () => {
      itemRepository.findOne.mockResolvedValue({
        id: 'item-1',
        tenantId: DIGITARO_TENANT_ID,
        assignmentId: 'assignment-1',
        status: AccessReviewItemStatus.PENDING,
        managerWorkerId: 'someone-else',
      } as AccessReviewItemEntity);
      rbacService.getAuthContext.mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: 'manager-user',
        roleCodes: [PolarisRoleCode.MANAGER],
        assignments: [],
        broadestScope: ScopeType.TEAM,
      });
      dataSource.query.mockResolvedValue([{ id: managerWorkerId }]);

      await expect(
        service.revokeItem('item-1', 'manager-user', undefined),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
