import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExitInterviewEntity } from '../entities/exit-interview.entity';
import { SeparationCaseEntity } from '../entities/separation-case.entity';
import { ExitInterviewStatus } from '../enums/onboarding.enum';
import { ExitInterviewService } from '../exit-interview.service';

describe('ExitInterviewService', () => {
  let service: ExitInterviewService;
  let interviewRepository: jest.Mocked<
    Pick<Repository<ExitInterviewEntity>, 'findOne' | 'save' | 'create'>
  >;
  let separationRepository: jest.Mocked<
    Pick<Repository<SeparationCaseEntity>, 'findOne'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let rbacService: { getAuthContext: jest.Mock };

  const separationId = 's0000000-0000-4000-8000-000000000001';
  const workerId = 'w0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    interviewRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (e) => ({
        ...(e as object),
        id: 'ei-1',
      })) as never,
      create: jest.fn((e) => e as ExitInterviewEntity) as never,
    };
    separationRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: separationId,
        tenantId: DIGITARO_TENANT_ID,
        workerId,
      }),
    };
    auditLogService = { append: jest.fn() };
    rbacService = {
      getAuthContext: jest.fn().mockResolvedValue({
        roleCodes: [PolarisRoleCode.PEOPLE_OPS],
        assignments: [],
        broadestScope: ScopeType.ALL,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExitInterviewService,
        {
          provide: getRepositoryToken(ExitInterviewEntity),
          useValue: interviewRepository,
        },
        {
          provide: getRepositoryToken(SeparationCaseEntity),
          useValue: separationRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
      ],
    }).compile();

    service = module.get(ExitInterviewService);
  });

  it('upserts exit interview for People Ops with audit', async () => {
    interviewRepository.findOne!.mockResolvedValue(null);

    const result = await service.upsert(
      separationId,
      {
        responses: { reasonForLeaving: 'Growth' },
        status: ExitInterviewStatus.SUBMITTED,
      },
      { userId: 'ops-user', correlationId: 'c1' },
    );

    expect(result.id).toBe('ei-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exit_interview.upsert' }),
    );
  });

  it('redacts sensitive fields for managers', async () => {
    rbacService.getAuthContext.mockResolvedValue({
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [],
      broadestScope: ScopeType.TEAM,
    });
    interviewRepository.findOne!.mockResolvedValue({
      id: 'ei-1',
      tenantId: DIGITARO_TENANT_ID,
      separationCaseId: separationId,
      workerId,
      status: ExitInterviewStatus.SUBMITTED,
      responses: {
        reasonForLeaving: 'secret',
        publicNote: 'ok',
      },
      conductedBy: 'ops',
      conductedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ExitInterviewEntity);

    const result = await service.get(separationId, 'mgr-user');

    expect(result.responses?.reasonForLeaving).toBe('[REDACTED]');
    expect(result.responses?.publicNote).toBe('ok');
  });

  it('forbids non–People Ops from writing', async () => {
    rbacService.getAuthContext.mockResolvedValue({
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [],
      broadestScope: ScopeType.TEAM,
    });

    await expect(
      service.upsert(separationId, { responses: {} }, { userId: 'mgr' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
