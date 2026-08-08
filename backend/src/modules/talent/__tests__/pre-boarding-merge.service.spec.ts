import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PreBoardingFieldValueEntity } from '../entities/pre-boarding-field-value.entity';
import { PreBoardingPacketEntity } from '../entities/pre-boarding-packet.entity';
import { WorkerPassportEntity } from '../entities/worker-passport.entity';
import { WorkerVisaRecordEntity } from '../entities/worker-visa-record.entity';
import {
  PreBoardingPacketStatus,
  VisaRecordType,
} from '../enums/onboarding.enum';
import { OnboardingService } from '../onboarding.service';
import { PreBoardingMergeService } from '../pre-boarding-merge.service';

describe('PreBoardingMergeService', () => {
  let service: PreBoardingMergeService;
  let packetRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let workerRepository: { findOne: jest.Mock; save: jest.Mock };
  let passportRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let visaRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let auditLogService: { append: jest.Mock };
  let onboardingService: { createCaseSystem: jest.Mock };

  const packetId = 'p0000000-0000-4000-8000-000000000001';
  const workerId = 'w0000000-0000-4000-8000-000000000001';

  const worker: WorkerEntity = {
    id: workerId,
    tenantId: DIGITARO_TENANT_ID,
    firstName: 'Jane',
    lastName: 'Doe',
    startDate: '2026-07-01',
    phone: null,
  } as WorkerEntity;

  function fieldValue(
    fieldKey: string,
    valueText: string,
  ): PreBoardingFieldValueEntity {
    return {
      id: `field-${fieldKey}`,
      tenantId: DIGITARO_TENANT_ID,
      packetId,
      fieldKey,
      valueEncrypted: null,
      valueText,
      attachmentBlobId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PreBoardingFieldValueEntity;
  }

  const passportFields = [
    fieldValue('passport_number', 'A1234567'),
    fieldValue('passport_nationality_code', 'pk'),
    fieldValue('passport_issuing_country_code', 'pk'),
    fieldValue('passport_issue_date', '2020-01-15'),
    fieldValue('passport_expiry_date', '2030-01-14'),
  ];

  const visaFields = [
    fieldValue('previous_visa_country_code', 'ae'),
    fieldValue('previous_visa_status_code', 'never_had_uae_visa'),
  ];

  function basePacket(
    overrides: Partial<PreBoardingPacketEntity> = {},
  ): PreBoardingPacketEntity {
    return {
      id: packetId,
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      candidateId: null,
      personalEmail: 'candidate@personal.example',
      status: PreBoardingPacketStatus.SUBMITTED,
      consentAt: new Date(),
      consentIp: null,
      templateVersionId: null,
      submittedAt: new Date(),
      mergedAt: null,
      correlationId: null,
      accessTokenHash: null,
      accessTokenExpiresAt: null,
      fieldValues: [...passportFields, ...visaFields],
      worker,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as PreBoardingPacketEntity;
  }

  beforeEach(async () => {
    packetRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (packet) => packet),
      createQueryBuilder: jest.fn(),
    };
    workerRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (w) => w),
    };
    passportRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (p) => ({ id: 'passport-1', ...p })),
      create: jest.fn((data) => data),
      update: jest.fn().mockResolvedValue(undefined),
    };
    visaRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (v) => ({ id: 'visa-1', ...v })),
      create: jest.fn((data) => data),
    };
    auditLogService = { append: jest.fn() };
    onboardingService = {
      createCaseSystem: jest.fn().mockResolvedValue({ id: 'case-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreBoardingMergeService,
        {
          provide: getRepositoryToken(PreBoardingPacketEntity),
          useValue: packetRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        {
          provide: getRepositoryToken(WorkerPassportEntity),
          useValue: passportRepository,
        },
        {
          provide: getRepositoryToken(WorkerVisaRecordEntity),
          useValue: visaRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: OnboardingService, useValue: onboardingService },
      ],
    }).compile();

    service = module.get(PreBoardingMergeService);
  });

  describe('mergePacket', () => {
    it('creates a passport and previous visa record from submitted fields', async () => {
      packetRepository.findOne.mockResolvedValue(basePacket());

      const result = await service.mergePacket(packetId);

      expect(result.skipped).toBe(false);
      expect(result.passportCreated).toBe(true);
      expect(result.visaRecordCreated).toBe(true);
      expect(result.onboardingCaseCreated).toBe(true);

      expect(passportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passportNumber: 'A1234567',
          nationalityCode: 'PK',
          issuingCountryCode: 'PK',
        }),
      );
      expect(visaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: 'AE',
          recordType: VisaRecordType.PREVIOUS,
          statusCode: 'never_had_uae_visa',
        }),
      );
      expect(packetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ mergedAt: expect.any(Date) }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'pre_boarding.packet.merge',
          entityId: packetId,
        }),
      );
      expect(onboardingService.createCaseSystem).toHaveBeenCalledWith(
        workerId,
        worker.startDate,
        DIGITARO_TENANT_ID,
        undefined,
      );
    });

    it('merges personal_phone into the worker profile when currently unset', async () => {
      packetRepository.findOne.mockResolvedValue(
        basePacket({
          fieldValues: [
            ...passportFields,
            ...visaFields,
            fieldValue('personal_phone', '+92 300 1234567'),
          ],
        }),
      );

      await service.mergePacket(packetId);

      expect(workerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+92 300 1234567' }),
      );
    });

    it('skips passport/visa creation when required fields are incomplete', async () => {
      packetRepository.findOne.mockResolvedValue(
        basePacket({
          fieldValues: [fieldValue('passport_number', 'A1234567')],
        }),
      );

      const result = await service.mergePacket(packetId);

      expect(result.skipped).toBe(false);
      expect(result.passportCreated).toBe(false);
      expect(result.visaRecordCreated).toBe(false);
      expect(passportRepository.save).not.toHaveBeenCalled();
      expect(visaRepository.save).not.toHaveBeenCalled();
    });

    it('is idempotent — skips packets already merged', async () => {
      packetRepository.findOne.mockResolvedValue(
        basePacket({ mergedAt: new Date() }),
      );

      const result = await service.mergePacket(packetId);

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('already_merged');
      expect(passportRepository.save).not.toHaveBeenCalled();
      expect(onboardingService.createCaseSystem).not.toHaveBeenCalled();
    });

    it('skips packets not yet in a mergeable status', async () => {
      packetRepository.findOne.mockResolvedValue(
        basePacket({ status: PreBoardingPacketStatus.IN_PROGRESS }),
      );

      const result = await service.mergePacket(packetId);

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('invalid_status');
    });

    it('does not duplicate a passport that already exists for the same number', async () => {
      passportRepository.findOne.mockResolvedValue({
        id: 'existing-passport',
        passportNumber: 'A1234567',
      });
      packetRepository.findOne.mockResolvedValue(basePacket());

      const result = await service.mergePacket(packetId);

      expect(result.passportCreated).toBe(true);
      expect(passportRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('runDailyMergeScan', () => {
    it('merges every eligible packet returned by the scan query', async () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([basePacket()]),
      };
      packetRepository.createQueryBuilder.mockReturnValue(qb);
      packetRepository.findOne.mockResolvedValue(basePacket());

      const result = await service.runDailyMergeScan();

      expect(result.merged).toBe(1);
      expect(result.skipped).toBe(0);
      expect(onboardingService.createCaseSystem).toHaveBeenCalledTimes(1);
    });
  });
});
