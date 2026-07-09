import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { QueryDirectoryDto } from '@/modules/core-hr/dto/query-directory.dto';
import { OrgService } from '@/modules/core-hr/org.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkMode, WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import { buildOrgChart, toDirectoryEntry } from '@/modules/core-hr/org.mapper';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

describe('OrgService', () => {
  let service: OrgService;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'createQueryBuilder' | 'findOne'>
  >;
  let rbacService: jest.Mocked<Pick<RbacService, 'getAuthContext'>>;

  const mockWorkers: WorkerEntity[] = [
    {
      id: 'manager-1',
      tenantId: DIGITARO_TENANT_ID,
      firstName: 'Sara',
      lastName: 'Ahmed',
      email: 'sara@digitaro.com',
      managerId: null,
      divisionId: 'd0000000-0000-4000-8000-000000000001',
      departmentId: null,
      countryCode: 'PK',
      bankCountryCode: 'PK',
      status: WorkerStatus.ACTIVE,
      employmentType: { displayName: 'Full-time employee' } as WorkerEntity['employmentType'],
      division: { name: 'Labs' } as WorkerEntity['division'],
      department: null,
      workMode: WorkMode.HYBRID,
      phone: '+92000000001',
    } as WorkerEntity,
    {
      id: 'report-1',
      tenantId: DIGITARO_TENANT_ID,
      firstName: 'Ali',
      lastName: 'Hassan',
      email: 'ali@digitaro.com',
      managerId: 'manager-1',
      divisionId: 'd0000000-0000-4000-8000-000000000001',
      departmentId: null,
      countryCode: 'PK',
      bankCountryCode: 'PK',
      status: WorkerStatus.ACTIVE,
      employmentType: { displayName: 'Full-time employee' } as WorkerEntity['employmentType'],
      division: { name: 'Labs' } as WorkerEntity['division'],
      department: null,
      workMode: WorkMode.REMOTE,
      phone: '+92000000002',
    } as WorkerEntity,
  ];

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
      getMany: jest.fn().mockResolvedValue(mockWorkers),
    } as unknown as SelectQueryBuilder<WorkerEntity>;

    workerRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn().mockResolvedValue(null),
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
        OrgService,
        { provide: getRepositoryToken(WorkerEntity), useValue: workerRepository },
        { provide: RbacService, useValue: rbacService },
      ],
    }).compile();

    service = module.get(OrgService);
  });

  it('builds org chart with manager hierarchy', async () => {
    const chart = await service.getOrgChart('actor-user-id');

    expect(chart).toHaveLength(1);
    expect(chart[0].workerId).toBe('manager-1');
    expect(chart[0].directReports).toHaveLength(1);
    expect(chart[0].directReports[0].workerId).toBe('report-1');
  });

  it('redacts phone in directory for non-privileged viewers', async () => {
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: DIGITARO_TENANT_ID,
      userId: 'employee-user-id',
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [
        {
          roleId: 'role-id',
          roleCode: PolarisRoleCode.EMPLOYEE,
          scopeType: ScopeType.ALL,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.ALL,
    });

    const query = Object.assign(new QueryDirectoryDto(), { page: 1, limit: 25 });
    const result = await service.getDirectory(query, 'employee-user-id');

    expect(result.items[0].phone).toBeNull();
    expect(result.meta.total).toBe(2);
  });

  it('maps directory entries via org mapper', () => {
    const auth = {
      tenantId: DIGITARO_TENANT_ID,
      userId: 'actor-user-id',
      roleCodes: [PolarisRoleCode.PEOPLE_OPS],
      assignments: [],
      broadestScope: ScopeType.ALL,
    };

    const entry = toDirectoryEntry(mockWorkers[0], auth, null);
    expect(entry.divisionName).toBe('Labs');
    expect(entry.phone).toBe('+92000000001');

    const chart = buildOrgChart(mockWorkers);
    expect(chart[0].directReports[0].firstName).toBe('Ali');
  });
});
