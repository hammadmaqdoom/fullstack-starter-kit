import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PolicyAcknowledgementEntity } from '../entities/policy-acknowledgement.entity';
import { PolicyPopulationRuleEntity } from '../entities/policy-population-rule.entity';
import { PolicyVersionEntity } from '../entities/policy-version.entity';
import { PolicyEntity } from '../entities/policy.entity';
import { PolicyCategory, PolicyVersionStatus } from '../enums/policy.enum';
import { PolicyService } from '../policy.service';

describe('PolicyService', () => {
  let service: PolicyService;
  let versionRepository: jest.Mocked<
    Pick<Repository<PolicyVersionEntity>, 'find' | 'findOne'>
  >;
  let acknowledgementRepository: jest.Mocked<
    Pick<
      Repository<PolicyAcknowledgementEntity>,
      'find' | 'findOne' | 'create' | 'save' | 'count'
    >
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const userId = 'u0000000-0000-4000-8000-000000000001';
  const versionId = 'v0000000-0000-4000-8000-000000000001';
  const policyId = 'p0000000-0000-4000-8000-000000000001';
  const employmentTypeId = 'e0000000-0000-4000-8000-000000000001';
  const divisionId = 'd0000000-0000-4000-8000-000000000001';

  const worker = {
    id: workerId,
    tenantId: DIGITARO_TENANT_ID,
    userId,
    countryCode: 'PK',
    divisionId,
    employmentTypeId,
  } as WorkerEntity;

  const publishedVersion = {
    id: versionId,
    tenantId: DIGITARO_TENANT_ID,
    policyId,
    version: 2,
    contentHtml: '<p>Security policy</p>',
    blobUrl: null,
    effectiveFrom: '2026-07-01',
    status: PolicyVersionStatus.PUBLISHED,
    policy: {
      id: policyId,
      code: 'ISO_INFOSEC',
      title: 'Information Security',
      category: PolicyCategory.SECURITY,
      isActive: true,
      populationRules: [
        {
          countryCode: 'PK',
          divisionId: null,
          employmentTypeId: null,
        } as PolicyPopulationRuleEntity,
      ],
    } as PolicyEntity,
  } as PolicyVersionEntity;

  beforeEach(async () => {
    versionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    acknowledgementRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity as PolicyAcknowledgementEntity),
      save: jest.fn(
        async (entity) =>
          ({
            ...entity,
            id: 'ack-1',
          }) as PolicyAcknowledgementEntity,
      ),
      count: jest.fn(),
    } as unknown as typeof acknowledgementRepository;

    workerRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: workerId } as WorkerEntity)
        .mockResolvedValue(worker),
    };

    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyService,
        {
          provide: getRepositoryToken(PolicyEntity),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(PolicyVersionEntity),
          useValue: versionRepository,
        },
        {
          provide: getRepositoryToken(PolicyPopulationRuleEntity),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(PolicyAcknowledgementEntity),
          useValue: acknowledgementRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PolicyService);
  });

  describe('workerMatchesPopulation', () => {
    it('matches all workers when no rules exist', () => {
      expect(service.workerMatchesPopulation(worker, [])).toBe(true);
    });

    it('matches when country rule aligns and other dims are null', () => {
      expect(
        service.workerMatchesPopulation(worker, [
          {
            countryCode: 'PK',
            divisionId: null,
            employmentTypeId: null,
          } as PolicyPopulationRuleEntity,
        ]),
      ).toBe(true);
    });

    it('does not match when country differs', () => {
      expect(
        service.workerMatchesPopulation(worker, [
          {
            countryCode: 'SG',
            divisionId: null,
            employmentTypeId: null,
          } as PolicyPopulationRuleEntity,
        ]),
      ).toBe(false);
    });
  });

  describe('getPendingAcknowledgements', () => {
    it('returns published versions matching population without acknowledgement', async () => {
      versionRepository.find.mockResolvedValue([publishedVersion]);
      acknowledgementRepository.find.mockResolvedValue([]);

      const pending = await service.getPendingAcknowledgements(userId);

      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        policyId,
        policyVersionId: versionId,
        policyCode: 'ISO_INFOSEC',
        version: 2,
      });
    });

    it('excludes already acknowledged versions', async () => {
      versionRepository.find.mockResolvedValue([publishedVersion]);
      acknowledgementRepository.find.mockResolvedValue([
        { policyVersionId: versionId } as PolicyAcknowledgementEntity,
      ]);

      const pending = await service.getPendingAcknowledgements(userId);

      expect(pending).toHaveLength(0);
    });

    it('excludes versions whose population rules do not match worker', async () => {
      versionRepository.find.mockResolvedValue([
        {
          ...publishedVersion,
          policy: {
            ...publishedVersion.policy!,
            populationRules: [
              {
                countryCode: 'AE',
                divisionId: null,
                employmentTypeId: null,
              } as PolicyPopulationRuleEntity,
            ],
          },
        } as PolicyVersionEntity,
      ]);

      const pending = await service.getPendingAcknowledgements(userId);

      expect(pending).toHaveLength(0);
    });
  });

  describe('acknowledge', () => {
    beforeEach(() => {
      // resolveActingWorkerId then full worker load
      workerRepository.findOne
        .mockReset()
        .mockResolvedValueOnce({ id: workerId } as WorkerEntity)
        .mockResolvedValue(worker);
      versionRepository.findOne.mockResolvedValue(publishedVersion);
      acknowledgementRepository.findOne.mockResolvedValue(null);
    });

    it('creates acknowledgement and writes audit log', async () => {
      const result = await service.acknowledge(
        versionId,
        userId,
        'corr-1',
        '127.0.0.1',
      );

      expect(result.id).toBe('ack-1');
      expect(acknowledgementRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          workerId,
          policyVersionId: versionId,
          ipAddress: '127.0.0.1',
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'policy.acknowledge',
          correlationId: 'corr-1',
        }),
      );
    });

    it('rejects duplicate acknowledgement', async () => {
      acknowledgementRepository.findOne.mockResolvedValue({
        id: 'existing',
      } as PolicyAcknowledgementEntity);

      await expect(
        service.acknowledge(versionId, userId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects acknowledgement of non-published version', async () => {
      versionRepository.findOne.mockResolvedValue({
        ...publishedVersion,
        status: PolicyVersionStatus.DRAFT,
      } as PolicyVersionEntity);

      await expect(
        service.acknowledge(versionId, userId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
