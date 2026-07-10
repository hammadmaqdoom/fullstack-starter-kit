import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatutoryRateEntryEntity } from '../entities/statutory-rate-entry.entity';
import { StatutoryRateScheduleEntity } from '../entities/statutory-rate-schedule.entity';
import {
  StatutoryRateUnit,
  StatutoryScheduleStatus,
} from '../enums/payroll.enum';
import { StatutoryRateService } from '../statutory-rate.service';

describe('StatutoryRateService', () => {
  let service: StatutoryRateService;
  let scheduleRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let entryRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let workerRepository: { count: jest.Mock };
  let auditLogService: { append: jest.Mock };

  const userId = 'u0000000-0000-4000-8000-000000000001';
  const legalEntityId = 'le000000-0000-4000-8000-000000000001';
  const scheduleId = 'sc000000-0000-4000-8000-000000000001';
  const priorActiveScheduleId = 'sc000000-0000-4000-8000-000000000002';

  beforeEach(async () => {
    scheduleRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => {
        if (Array.isArray(entity)) {
          return entity.map((item, index) => ({
            ...item,
            id: item.id ?? `${scheduleId}-${index}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
        }
        return {
          ...entity,
          id: entity.id ?? scheduleId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      createQueryBuilder: jest.fn(),
    };

    entryRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) =>
        Array.isArray(entity)
          ? entity.map((item, index) => ({
              ...item,
              id: item.id ?? `entry-${index}`,
            }))
          : { ...entity, id: entity.id ?? 'entry-1' },
      ),
    };

    workerRepository = {
      count: jest.fn().mockResolvedValue(0),
    };

    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatutoryRateService,
        {
          provide: getRepositoryToken(StatutoryRateScheduleEntity),
          useValue: scheduleRepository,
        },
        {
          provide: getRepositoryToken(StatutoryRateEntryEntity),
          useValue: entryRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(StatutoryRateService);
  });

  describe('createSchedule', () => {
    it('creates a draft schedule and writes an audit_log entry', async () => {
      const result = await service.createSchedule(
        {
          legalEntityId,
          countryCode: 'PK',
          name: 'PK EOBI 2026',
          effectiveFrom: '2026-08-01',
          entries: [
            {
              rateKey: 'eobi_employee',
              rateValue: 1,
              rateUnit: StatutoryRateUnit.PERCENTAGE,
            },
          ],
        },
        { userId, correlationId: 'corr-schedule-1' },
      );

      expect(result.status).toBe(StatutoryScheduleStatus.DRAFT);
      expect(result.entries).toHaveLength(1);
      expect(scheduleRepository.save).toHaveBeenCalledTimes(1);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.statutory_rate_schedule.create',
          entityType: 'statutory_rate_schedule',
          entityId: scheduleId,
          correlationId: 'corr-schedule-1',
          changes: expect.objectContaining({
            name: { old: null, new: 'PK EOBI 2026' },
            countryCode: { old: null, new: 'PK' },
          }),
        }),
      );
    });
  });

  describe('activateSchedule', () => {
    it('supersedes the previous active schedule for the same legal entity + country', async () => {
      scheduleRepository.findOne.mockResolvedValueOnce({
        id: scheduleId,
        tenantId: DIGITARO_TENANT_ID,
        legalEntityId,
        countryCode: 'PK',
        status: StatutoryScheduleStatus.DRAFT,
      });
      scheduleRepository.find.mockResolvedValueOnce([
        {
          id: priorActiveScheduleId,
          tenantId: DIGITARO_TENANT_ID,
          legalEntityId,
          countryCode: 'PK',
          status: StatutoryScheduleStatus.ACTIVE,
        },
      ]);

      const result = await service.activateSchedule(scheduleId, { userId });

      expect(result.status).toBe(StatutoryScheduleStatus.ACTIVE);
      expect(scheduleRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: priorActiveScheduleId,
            status: StatutoryScheduleStatus.SUPERSEDED,
          }),
          expect.objectContaining({
            id: scheduleId,
            status: StatutoryScheduleStatus.ACTIVE,
          }),
        ]),
      );
    });

    it('writes an audit_log entry when a schedule is activated', async () => {
      scheduleRepository.findOne.mockResolvedValueOnce({
        id: scheduleId,
        tenantId: DIGITARO_TENANT_ID,
        legalEntityId,
        countryCode: 'PK',
        status: StatutoryScheduleStatus.DRAFT,
      });
      scheduleRepository.find.mockResolvedValueOnce([]);

      await service.activateSchedule(scheduleId, {
        userId,
        correlationId: 'corr-activate-1',
      });

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.statutory_rate_schedule.activate',
          entityType: 'statutory_rate_schedule',
          entityId: scheduleId,
          correlationId: 'corr-activate-1',
          changes: expect.objectContaining({
            status: {
              old: StatutoryScheduleStatus.DRAFT,
              new: StatutoryScheduleStatus.ACTIVE,
            },
          }),
        }),
      );
    });

    it('throws NotFoundException when the schedule does not exist', async () => {
      scheduleRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.activateSchedule(scheduleId, { userId }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(auditLogService.append).not.toHaveBeenCalled();
    });
  });

  describe('resolveRates', () => {
    it('returns entries from the active schedule effective on the given date', async () => {
      scheduleRepository.findOne.mockResolvedValueOnce({
        id: scheduleId,
        tenantId: DIGITARO_TENANT_ID,
        legalEntityId,
        countryCode: 'PK',
        status: StatutoryScheduleStatus.ACTIVE,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
      });
      entryRepository.find.mockResolvedValueOnce([
        {
          id: 'entry-1',
          tenantId: DIGITARO_TENANT_ID,
          scheduleId,
          rateKey: 'eobi_employee',
          rateValue: '1.000000',
          rateUnit: StatutoryRateUnit.PERCENTAGE,
        },
      ]);

      const result = await service.resolveRates(
        legalEntityId,
        'PK',
        '2026-08-15',
      );

      expect(result).toHaveLength(1);
      expect(result[0].rateKey).toBe('eobi_employee');
      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scheduleId }),
        }),
      );
    });

    it('returns an empty array when no active schedule is effective on the given date', async () => {
      scheduleRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.resolveRates(
        legalEntityId,
        'PK',
        '2026-08-15',
      );

      expect(result).toEqual([]);
      expect(entryRepository.find).not.toHaveBeenCalled();
    });
  });
});
