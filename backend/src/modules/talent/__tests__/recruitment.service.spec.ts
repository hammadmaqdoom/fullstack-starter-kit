import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CandidateEntity } from '../entities/candidate.entity';
import { InterviewScorecardEntity } from '../entities/interview-scorecard.entity';
import { JobRequisitionEntity } from '../entities/job-requisition.entity';
import { ManpowerPositionEntity } from '../entities/manpower-position.entity';
import { CandidateStatus, RequisitionStatus } from '../enums/recruitment.enum';
import { RecruitmentService } from '../recruitment.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let requisitionRepository: jest.Mocked<
    Pick<
      Repository<JobRequisitionEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder'
    >
  >;
  let candidateRepository: jest.Mocked<
    Pick<
      Repository<CandidateEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder'
    >
  >;
  let scorecardRepository: jest.Mocked<
    Pick<Repository<InterviewScorecardEntity>, 'create' | 'save' | 'find'>
  >;
  let manpowerPositionRepository: jest.Mocked<
    Pick<Repository<ManpowerPositionEntity>, 'findOne' | 'save'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;

  const tenantId = DIGITARO_TENANT_ID;
  const peopleOpsAuth = {
    tenantId,
    userId: 'ops-user',
    roleCodes: [PolarisRoleCode.PEOPLE_OPS],
    assignments: [],
    broadestScope: ScopeType.ALL,
  };

  const buildQb = () =>
    ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }) as unknown as SelectQueryBuilder<any>;

  beforeEach(async () => {
    requisitionRepository = {
      create: jest.fn((entity) => entity as JobRequisitionEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: entity.id ?? 'req-1' }) as JobRequisitionEntity,
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(buildQb()),
    } as unknown as typeof requisitionRepository;
    candidateRepository = {
      create: jest.fn((entity) => entity as CandidateEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: entity.id ?? 'cand-1' }) as CandidateEntity,
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(buildQb()),
    } as unknown as typeof candidateRepository;
    scorecardRepository = {
      create: jest.fn((entity) => entity as InterviewScorecardEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: 'card-1' }) as InterviewScorecardEntity,
      ),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as typeof scorecardRepository;
    manpowerPositionRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as typeof manpowerPositionRepository;
    workerRepository = {
      findOne: jest.fn(),
    } as unknown as typeof workerRepository;
    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(peopleOpsAuth);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        {
          provide: getRepositoryToken(JobRequisitionEntity),
          useValue: requisitionRepository,
        },
        {
          provide: getRepositoryToken(CandidateEntity),
          useValue: candidateRepository,
        },
        {
          provide: getRepositoryToken(InterviewScorecardEntity),
          useValue: scorecardRepository,
        },
        {
          provide: getRepositoryToken(ManpowerPositionEntity),
          useValue: manpowerPositionRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
      ],
    }).compile();

    service = module.get(RecruitmentService);
  });

  it('creates a job requisition in pending_division_head status and writes audit log', async () => {
    const requisition = await service.createRequisition(
      {
        title: 'Backend Engineer',
        employmentTypeId: 'et-1',
        countryCode: 'PK',
        hiringManagerWorkerId: 'mgr-1',
      } as any,
      { userId: 'requester-1', tenantId },
    );

    expect(requisition.status).toBe(RequisitionStatus.PENDING_DIVISION_HEAD);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'requisition.create',
        entityType: 'job_requisition',
      }),
    );
  });

  it('rejects a division-head approval transition without the required role', async () => {
    requisitionRepository.findOne.mockResolvedValue({
      id: 'req-1',
      tenantId,
      status: RequisitionStatus.PENDING_DIVISION_HEAD,
    } as JobRequisitionEntity);
    getAuthContext.mockResolvedValue({
      ...peopleOpsAuth,
      roleCodes: [PolarisRoleCode.EMPLOYEE],
    });

    await expect(
      service.updateRequisition(
        'req-1',
        { status: RequisitionStatus.PENDING_PEOPLE_OPS } as any,
        { userId: 'employee-1', tenantId },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects candidates applying to a requisition that is not open', async () => {
    requisitionRepository.findOne.mockResolvedValue({
      id: 'req-1',
      tenantId,
      status: RequisitionStatus.DRAFT,
    } as JobRequisitionEntity);

    await expect(
      service.createCandidate(
        {
          requisitionId: 'req-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        } as any,
        { userId: 'ops-user', tenantId },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('increments requisition and manpower position fill counts when a candidate is hired', async () => {
    candidateRepository.findOne.mockResolvedValue({
      id: 'cand-1',
      tenantId,
      requisitionId: 'req-1',
      status: CandidateStatus.OFFER,
    } as CandidateEntity);
    requisitionRepository.findOne.mockResolvedValue({
      id: 'req-1',
      tenantId,
      status: RequisitionStatus.OPEN,
      headcount: 1,
      filledCount: 0,
      manpowerPositionId: 'pos-1',
    } as JobRequisitionEntity);
    manpowerPositionRepository.findOne.mockResolvedValue({
      id: 'pos-1',
      tenantId,
      headcount: 1,
      filledCount: 0,
    } as ManpowerPositionEntity);

    await service.updateCandidateStatus(
      'cand-1',
      { status: CandidateStatus.HIRED } as any,
      { userId: 'ops-user', tenantId },
    );

    expect(requisitionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        filledCount: 1,
        status: RequisitionStatus.CLOSED,
      }),
    );
    expect(manpowerPositionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ filledCount: 1 }),
    );
  });

  it('requires an interviewer worker profile to submit a scorecard', async () => {
    candidateRepository.findOne.mockResolvedValue({
      id: 'cand-1',
      tenantId,
    } as CandidateEntity);
    workerRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createScorecard(
        'cand-1',
        {
          stage: 'panel',
          criteria: [{ name: 'Communication', weight: 1, score: 4 }],
        } as any,
        { userId: 'no-worker-user', tenantId },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
