import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CurrencyCodeEntity } from '../entities/currency-code.entity';
import {
  ExchangeRateEntity,
  ExchangeRateFetchBatchEntity,
} from '../entities/exchange-rate.entity';
import { FxVarianceAlertConfigEntity } from '../entities/fx-variance-alert-config.entity';
import { RateStatus } from '../enums/country-config.enum';
import { FxService } from '../fx.service';

describe('FxService', () => {
  let service: FxService;
  let currencyRepository: jest.Mocked<Pick<Repository<CurrencyCodeEntity>, 'find'>>;
  let exchangeRateRepository: jest.Mocked<
    Pick<
      Repository<ExchangeRateEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder'
    >
  >;
  let fetchBatchRepository: jest.Mocked<Pick<Repository<ExchangeRateFetchBatchEntity>, 'findOne'>>;
  let varianceConfigRepository: jest.Mocked<
    Pick<Repository<FxVarianceAlertConfigEntity>, 'create' | 'save' | 'findOne' | 'find'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;

  beforeEach(async () => {
    const updateQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    } as unknown as SelectQueryBuilder<ExchangeRateEntity>;

    currencyRepository = {
      find: jest.fn().mockResolvedValue([
        { code: 'USD' } as CurrencyCodeEntity,
        { code: 'PKR' } as CurrencyCodeEntity,
      ]),
    };

    exchangeRateRepository = {
      create: jest.fn((entity) => entity as ExchangeRateEntity),
      save: jest.fn(async (entity) => ({ ...entity, id: 'rate-1' }) as ExchangeRateEntity),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(updateQb),
    } as unknown as typeof exchangeRateRepository;

    fetchBatchRepository = { findOne: jest.fn() };

    varianceConfigRepository = {
      create: jest.fn((entity) => entity as FxVarianceAlertConfigEntity),
      save: jest.fn(
        async (entity) => ({ ...entity, id: 'config-1' }) as FxVarianceAlertConfigEntity,
      ),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn(),
    } as unknown as typeof varianceConfigRepository;

    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        { provide: getRepositoryToken(CurrencyCodeEntity), useValue: currencyRepository },
        { provide: getRepositoryToken(ExchangeRateEntity), useValue: exchangeRateRepository },
        {
          provide: getRepositoryToken(ExchangeRateFetchBatchEntity),
          useValue: fetchBatchRepository,
        },
        {
          provide: getRepositoryToken(FxVarianceAlertConfigEntity),
          useValue: varianceConfigRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(FxService);
  });

  it('creates a pending override rate and writes an audit log entry', async () => {
    const result = await service.overrideRate(
      { fromCurrency: 'USD', toCurrency: 'PKR', rate: 285.5, effectiveFrom: '2026-07-11' },
      'finance-user',
    );

    expect(result.id).toBe('rate-1');
    expect(result.status).toBe(RateStatus.PENDING);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exchange_rate.override', entityType: 'exchange_rate' }),
    );
  });

  it('rejects an override for unrecognized currencies', async () => {
    currencyRepository.find.mockResolvedValue([{ code: 'USD' } as CurrencyCodeEntity]);

    await expect(
      service.overrideRate(
        { fromCurrency: 'USD', toCurrency: 'ZZZ', rate: 1, effectiveFrom: '2026-07-11' },
        'finance-user',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves a pending rate, supersedes the prior active rate, and writes an audit log entry', async () => {
    exchangeRateRepository.findOne.mockResolvedValue({
      id: 'rate-1',
      tenantId: DIGITARO_TENANT_ID,
      fromCurrency: 'USD',
      toCurrency: 'PKR',
      rateType: 'spot',
      status: RateStatus.PENDING,
      approvedBy: null,
    } as unknown as ExchangeRateEntity);

    const result = await service.approveRate('rate-1', 'finance-user');

    expect(result.status).toBe(RateStatus.ACTIVE);
    expect(result.approvedBy).toBe('finance-user');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exchange_rate.approve' }),
    );
  });

  it('rejects approving a rate that is not pending', async () => {
    exchangeRateRepository.findOne.mockResolvedValue({
      id: 'rate-1',
      status: RateStatus.ACTIVE,
    } as unknown as ExchangeRateEntity);

    await expect(service.approveRate('rate-1', 'finance-user')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when approving a nonexistent rate', async () => {
    exchangeRateRepository.findOne.mockResolvedValue(null);

    await expect(service.approveRate('missing', 'finance-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a variance alert config and writes an audit log entry', async () => {
    const result = await service.upsertVarianceAlertConfig(
      { fromCurrency: 'USD', toCurrency: 'PKR', thresholdPercent: 3.5 },
      'finance-user',
    );

    expect(result.id).toBe('config-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'fx_variance_alert_config.create' }),
    );
  });
});
