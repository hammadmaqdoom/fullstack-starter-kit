import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BenefitTypeEntity } from '@/modules/country-config/entities/benefit-type.entity';
import {
  BenefitDeliveryMode,
  BenefitTypeStatus,
} from '@/modules/country-config/enums/setup-wizard.enum';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BenefitService } from '../benefit.service';
import { BenefitTypeFieldEntity } from '../entities/benefit-type-field.entity';
import { EmployeeBenefitEntity } from '../entities/employee-benefit.entity';
import { EmployeeBenefitStatus } from '../enums/payroll.enum';

describe('BenefitService', () => {
  let service: BenefitService;
  let benefitTypeRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let benefitTypeFieldRepository: { create: jest.Mock; save: jest.Mock };
  let employeeBenefitRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let workerRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const userId = 'u0000000-0000-4000-8000-000000000001';
  const benefitTypeId = 'bt000000-0000-4000-8000-000000000001';

  const pkWorker = {
    id: workerId,
    userId,
    tenantId: DIGITARO_TENANT_ID,
    countryCode: 'PK',
  } as WorkerEntity;

  beforeEach(async () => {
    benefitTypeRepository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? benefitTypeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createQueryBuilder: jest.fn(),
    };

    benefitTypeFieldRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entities) =>
        (Array.isArray(entities) ? entities : [entities]).map(
          (entity, index) => ({
            ...entity,
            id: `field-${index}`,
          }),
        ),
      ),
    };

    employeeBenefitRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? 'eb-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    workerRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where?.id === workerId || where?.userId === userId) {
          return pkWorker;
        }
        return null;
      }),
    };

    auditLogService = { append: jest.fn() };
    rbacService = {
      getAuthContext: jest.fn().mockResolvedValue({
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
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BenefitService,
        {
          provide: getRepositoryToken(BenefitTypeEntity),
          useValue: benefitTypeRepository,
        },
        {
          provide: getRepositoryToken(BenefitTypeFieldEntity),
          useValue: benefitTypeFieldRepository,
        },
        {
          provide: getRepositoryToken(EmployeeBenefitEntity),
          useValue: employeeBenefitRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
      ],
    }).compile();

    service = module.get(BenefitService);
  });

  describe('createBenefitType', () => {
    it('creates a benefit type and writes an audit_log entry', async () => {
      benefitTypeRepository.findOne.mockResolvedValue(null);

      const result = await service.createBenefitType(
        {
          code: 'PK_HOUSING_ALLOWANCE',
          name: 'Housing Allowance',
          category: 'Allowances',
          countryCode: 'PK',
          deliveryMode: BenefitDeliveryMode.CASH,
        },
        { userId, correlationId: 'corr-benefit-1' },
      );

      expect(result.code).toBe('PK_HOUSING_ALLOWANCE');
      expect(benefitTypeRepository.save).toHaveBeenCalledTimes(1);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.benefit_type.create',
          entityType: 'benefit_type',
          entityId: benefitTypeId,
          correlationId: 'corr-benefit-1',
          changes: expect.objectContaining({
            code: { old: null, new: 'PK_HOUSING_ALLOWANCE' },
          }),
        }),
      );
    });

    it('rejects duplicate benefit type codes without writing audit_log', async () => {
      benefitTypeRepository.findOne.mockResolvedValue({
        id: benefitTypeId,
        code: 'PK_HOUSING_ALLOWANCE',
      });

      await expect(
        service.createBenefitType(
          {
            code: 'PK_HOUSING_ALLOWANCE',
            name: 'Housing Allowance',
            category: 'Allowances',
          },
          { userId },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(auditLogService.append).not.toHaveBeenCalled();
    });
  });

  describe('assignEmployeeBenefit', () => {
    it('rejects when benefit type country does not match worker country', async () => {
      benefitTypeRepository.findOne.mockResolvedValue({
        id: benefitTypeId,
        tenantId: DIGITARO_TENANT_ID,
        code: 'UAE_HOUSING',
        countryCode: 'AE',
        status: BenefitTypeStatus.ACTIVE,
      } as BenefitTypeEntity);

      await expect(
        service.assignEmployeeBenefit(
          {
            workerId,
            benefitTypeId,
            effectiveFrom: '2026-08-01',
          },
          { userId },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(employeeBenefitRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });

    it('assigns benefit and writes audit_log when country matches', async () => {
      benefitTypeRepository.findOne.mockResolvedValue({
        id: benefitTypeId,
        tenantId: DIGITARO_TENANT_ID,
        code: 'PK_HOUSING_ALLOWANCE',
        countryCode: 'PK',
        status: BenefitTypeStatus.ACTIVE,
      } as BenefitTypeEntity);

      const result = await service.assignEmployeeBenefit(
        {
          workerId,
          benefitTypeId,
          effectiveFrom: '2026-08-01',
          status: EmployeeBenefitStatus.ACTIVE,
        },
        { userId, correlationId: 'corr-assign-1' },
      );

      expect(result.workerId).toBe(workerId);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.employee_benefit.assign',
          entityType: 'employee_benefit',
          correlationId: 'corr-assign-1',
        }),
      );
    });
  });

  describe('listBenefitTypes', () => {
    it('filters by country when provided', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      benefitTypeRepository.createQueryBuilder.mockReturnValue(qb);

      await service.listBenefitTypes({ countryCode: 'SG' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(benefitType.countryCode = :countryCode OR benefitType.countryCode IS NULL)',
        { countryCode: 'SG' },
      );
    });

    it('does not apply a country filter when none is provided', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      benefitTypeRepository.createQueryBuilder.mockReturnValue(qb);

      await service.listBenefitTypes({} as any);

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('countryCode'),
        expect.anything(),
      );
    });
  });
});
