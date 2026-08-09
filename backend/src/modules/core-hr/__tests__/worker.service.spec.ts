import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { CountryConfigService } from '@/modules/country-config/country-config.service';
import { PayrollRoute } from '@/modules/country-config/enums/country-config.enum';
import { RowScopeService } from '@/shared/scope/row-scope.service';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkerDto } from '@/modules/core-hr/dto/create-worker.dto';
import { ContractorProfileEntity } from '@/modules/core-hr/entities/contractor-profile.entity';
import { WorkerStatutoryIdEntity } from '@/modules/core-hr/entities/worker-statutory-id.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  EntraStatus,
  WorkMode,
  WorkerStatus,
} from '@/modules/core-hr/enums/worker.enum';
import { WorkerService } from '@/modules/core-hr/worker.service';
import { toWorkerResponse } from '@/modules/core-hr/worker.mapper';

const FULL_TIME_TYPE_ID = 'c0000000-0000-4000-8000-000000000001';

describe('WorkerService', () => {
  let service: WorkerService;
  let workerRepository: jest.Mocked<
    Pick<
      Repository<WorkerEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder' | 'softDelete' | 'update'
    >
  >;
  let contractorProfileRepository: jest.Mocked<
    Pick<Repository<ContractorProfileEntity>, 'create' | 'save' | 'findOne'>
  >;
  let workerStatutoryIdRepository: jest.Mocked<
    Pick<
      Repository<WorkerStatutoryIdEntity>,
      'create' | 'save' | 'find' | 'delete' | 'createQueryBuilder'
    >
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let countryConfigService: jest.Mocked<
    Pick<CountryConfigService, 'resolveEmploymentTypeCountryRules'>
  >;
  let rbacService: jest.Mocked<Pick<RbacService, 'getAuthContext'>>;

  const pkWorkerDto: CreateWorkerDto = {
    employmentTypeId: FULL_TIME_TYPE_ID,
    countryCode: 'PK',
    firstName: 'Ayesha',
    lastName: 'Khan',
    email: 'ayesha.khan@digitaro.com',
    startDate: '2026-04-01',
    workMode: WorkMode.HYBRID,
    statutoryFields: {
      cnic: '35202-1234567-1',
      ntn: '1234567-8',
      eobi_number: 'EOBI-001',
    },
    compensationBand: {
      currency: 'PKR',
      baseSalary: 250000,
      payFrequency: 'monthly',
    },
  };

  beforeEach(async () => {
    workerRepository = {
      create: jest.fn((entity) => entity as WorkerEntity),
      save: jest.fn(async (entity) =>
        ({
          ...entity,
          id: 'w0000000-0000-4000-8000-000000000001',
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as WorkerEntity,
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    } as unknown as typeof workerRepository;
    contractorProfileRepository = {
      create: jest.fn((entity) => entity as ContractorProfileEntity),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as typeof contractorProfileRepository;
    workerStatutoryIdRepository = {
      create: jest.fn((entity) => entity as WorkerStatutoryIdEntity),
      save: jest.fn(async (rows) => rows),
      find: jest.fn().mockResolvedValue([
        { fieldKey: 'cnic', fieldValue: '35202-1234567-1' },
        { fieldKey: 'ntn', fieldValue: '1234567-8' },
        { fieldKey: 'eobi_number', fieldValue: 'EOBI-001' },
      ]),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as typeof workerStatutoryIdRepository;
    auditLogService = { append: jest.fn() };
    countryConfigService = {
      resolveEmploymentTypeCountryRules: jest.fn().mockResolvedValue({
        employmentType: {
          id: FULL_TIME_TYPE_ID,
          code: 'FULL_TIME',
          displayName: 'Full-time employee',
          isFte: true,
        },
        payrollRoute: PayrollRoute.EMPLOYEE_PAY_RUN,
      }),
    };
    rbacService = {
      getAuthContext: jest.fn().mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId: 'actor-user-id',
        roleCodes: [PolarisRoleCode.PEOPLE_OPS],
        assignments: [
          {
            roleId: 'role-id',
            roleCode: PolarisRoleCode.PEOPLE_OPS,
            scopeType: ScopeType.ALL,
            scopeId: null,
          },
        ],
        broadestScope: ScopeType.ALL,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerService,
        RowScopeService,
        { provide: getRepositoryToken(WorkerEntity), useValue: workerRepository },
        {
          provide: getRepositoryToken(ContractorProfileEntity),
          useValue: contractorProfileRepository,
        },
        {
          provide: getRepositoryToken(WorkerStatutoryIdEntity),
          useValue: workerStatutoryIdRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: CountryConfigService, useValue: countryConfigService },
        { provide: RbacService, useValue: rbacService },
      ],
    }).compile();

    service = module.get(WorkerService);
  });

  it('creates PK full-time worker and writes audit log', async () => {
    const result = await service.create(
      pkWorkerDto,
      'actor-user-id',
      DIGITARO_TENANT_ID,
      'corr-1',
    );

    expect(workerRepository.save).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'worker.create',
        entityType: 'worker',
        actorId: 'actor-user-id',
        correlationId: 'corr-1',
      }),
    );
    expect(result.entraStatus).toBe(EntraStatus.PENDING);
    expect(result.statutoryFields?.cnic).toBe('35202-1234567-1');
    expect(result.compensationBand?.baseSalary).toBe(250000);
  });

  it('rejects missing statutory fields for country', async () => {
    await expect(
      service.create(
        {
          ...pkWorkerDto,
          statutoryFields: { cnic: '35202-1234567-1' },
        },
        'actor-user-id',
        DIGITARO_TENANT_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('redacts compensation from manager responses', async () => {
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: DIGITARO_TENANT_ID,
      userId: 'manager-user-id',
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [
        {
          roleId: 'role-id',
          roleCode: PolarisRoleCode.MANAGER,
          scopeType: ScopeType.TEAM,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.TEAM,
    });

    const result = await service.create(
      pkWorkerDto,
      'manager-user-id',
      DIGITARO_TENANT_ID,
    );

    expect(result.compensationBand).toBeNull();
    expect(result.statutoryFields).toBeNull();
  });

  it('persists dateOfBirth on create', async () => {
    await service.create(
      { ...pkWorkerDto, dateOfBirth: '1995-08-10' },
      'actor-user-id',
      DIGITARO_TENANT_ID,
    );

    expect(workerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ dateOfBirth: '1995-08-10' }),
    );
  });

  it('redacts dateOfBirth for non-self non-sensitive viewers', () => {
    const worker = {
      id: 'w1',
      tenantId: DIGITARO_TENANT_ID,
      userId: 'owner-user',
      dateOfBirth: '1995-08-10',
      compensationBand: null,
    } as unknown as WorkerEntity;
    const auth = {
      tenantId: DIGITARO_TENANT_ID,
      userId: 'other-user',
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [],
      broadestScope: ScopeType.OWN,
    };
    expect(toWorkerResponse(worker, auth).dateOfBirth).toBeNull();
  });

  it('includes dateOfBirth for self', () => {
    const worker = {
      id: 'w1',
      tenantId: DIGITARO_TENANT_ID,
      userId: 'owner-user',
      dateOfBirth: '1995-08-10',
      compensationBand: null,
    } as unknown as WorkerEntity;
    const auth = {
      tenantId: DIGITARO_TENANT_ID,
      userId: 'owner-user',
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [],
      broadestScope: ScopeType.OWN,
    };
    expect(toWorkerResponse(worker, auth).dateOfBirth).toBe('1995-08-10');
  });
});
