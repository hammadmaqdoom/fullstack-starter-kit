import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OverrideExchangeRateDto, UpsertFxVarianceAlertConfigDto } from './dto/fx.dto';
import { CurrencyCodeEntity } from './entities/currency-code.entity';
import {
  ExchangeRateEntity,
  ExchangeRateFetchBatchEntity,
} from './entities/exchange-rate.entity';
import { FxVarianceAlertConfigEntity } from './entities/fx-variance-alert-config.entity';
import { RateSource, RateStatus, RateType } from './enums/country-config.enum';

@Injectable()
export class FxService {
  constructor(
    @InjectRepository(CurrencyCodeEntity)
    private readonly currencyRepository: Repository<CurrencyCodeEntity>,
    @InjectRepository(ExchangeRateEntity)
    private readonly exchangeRateRepository: Repository<ExchangeRateEntity>,
    @InjectRepository(ExchangeRateFetchBatchEntity)
    private readonly fetchBatchRepository: Repository<ExchangeRateFetchBatchEntity>,
    @InjectRepository(FxVarianceAlertConfigEntity)
    private readonly varianceConfigRepository: Repository<FxVarianceAlertConfigEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listCurrencies(): Promise<CurrencyCodeEntity[]> {
    return this.currencyRepository.find({ order: { code: 'ASC' } });
  }

  async listExchangeRates(
    filters: { fromCurrency?: string; toCurrency?: string; status?: RateStatus },
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExchangeRateEntity[]> {
    const qb = this.exchangeRateRepository
      .createQueryBuilder('rate')
      .where('rate.tenantId = :tenantId', { tenantId })
      .orderBy('rate.effectiveFrom', 'DESC');

    if (filters.fromCurrency) {
      qb.andWhere('rate.fromCurrency = :fromCurrency', {
        fromCurrency: filters.fromCurrency,
      });
    }
    if (filters.toCurrency) {
      qb.andWhere('rate.toCurrency = :toCurrency', {
        toCurrency: filters.toCurrency,
      });
    }
    if (filters.status) {
      qb.andWhere('rate.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  async getFetchStatus(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExchangeRateFetchBatchEntity | null> {
    return this.fetchBatchRepository.findOne({
      where: { tenantId },
      order: { fetchedAt: 'DESC' },
    });
  }

  async overrideRate(
    dto: OverrideExchangeRateDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExchangeRateEntity> {
    await this.assertCurrenciesExist(dto.fromCurrency, dto.toCurrency);

    const saved = await this.exchangeRateRepository.save(
      this.exchangeRateRepository.create({
        tenantId,
        fromCurrency: dto.fromCurrency.toUpperCase(),
        toCurrency: dto.toCurrency.toUpperCase(),
        rate: dto.rate.toFixed(8),
        rateType: RateType.SPOT,
        effectiveFrom: dto.effectiveFrom,
        source: RateSource.MANUAL_OVERRIDE,
        status: RateStatus.PENDING,
        approvedBy: null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'exchange_rate.override',
      entityType: 'exchange_rate',
      entityId: saved.id,
      changes: {
        fromCurrency: { old: null, new: saved.fromCurrency },
        toCurrency: { old: null, new: saved.toCurrency },
        rate: { old: null, new: saved.rate },
        reason: { old: null, new: dto.reason ?? null },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async approveRate(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExchangeRateEntity> {
    const rate = await this.exchangeRateRepository.findOne({
      where: { id, tenantId },
    });

    if (!rate) {
      throw new NotFoundException({
        code: 'EXCHANGE_RATE_NOT_FOUND',
        message: 'Exchange rate not found',
      });
    }

    if (rate.status !== RateStatus.PENDING) {
      throw new BadRequestException({
        code: 'EXCHANGE_RATE_NOT_PENDING',
        message: 'Only pending override rates can be approved',
      });
    }

    await this.exchangeRateRepository
      .createQueryBuilder()
      .update(ExchangeRateEntity)
      .set({ status: RateStatus.SUPERSEDED })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('fromCurrency = :fromCurrency', { fromCurrency: rate.fromCurrency })
      .andWhere('toCurrency = :toCurrency', { toCurrency: rate.toCurrency })
      .andWhere('rateType = :rateType', { rateType: rate.rateType })
      .andWhere('status = :status', { status: RateStatus.ACTIVE })
      .andWhere('id != :id', { id: rate.id })
      .execute();

    rate.status = RateStatus.ACTIVE;
    rate.approvedBy = actorId;
    const saved = await this.exchangeRateRepository.save(rate);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'exchange_rate.approve',
      entityType: 'exchange_rate',
      entityId: saved.id,
      changes: {
        status: { old: RateStatus.PENDING, new: saved.status },
        approvedBy: { old: null, new: saved.approvedBy },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async listVarianceAlertConfigs(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<FxVarianceAlertConfigEntity[]> {
    return this.varianceConfigRepository.find({
      where: { tenantId },
      order: { fromCurrency: 'ASC', toCurrency: 'ASC' },
    });
  }

  async upsertVarianceAlertConfig(
    dto: UpsertFxVarianceAlertConfigDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<FxVarianceAlertConfigEntity> {
    await this.assertCurrenciesExist(dto.fromCurrency, dto.toCurrency);

    const fromCurrency = dto.fromCurrency.toUpperCase();
    const toCurrency = dto.toCurrency.toUpperCase();

    const existing = await this.varianceConfigRepository.findOne({
      where: { tenantId, fromCurrency, toCurrency },
    });

    const before = existing ? { ...existing } : null;

    const saved = await this.varianceConfigRepository.save(
      this.varianceConfigRepository.create({
        ...existing,
        tenantId,
        fromCurrency,
        toCurrency,
        thresholdPercent: dto.thresholdPercent.toFixed(2),
        isActive: dto.isActive ?? existing?.isActive ?? true,
        updatedByUserId: actorId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: before
        ? 'fx_variance_alert_config.update'
        : 'fx_variance_alert_config.create',
      entityType: 'fx_variance_alert_config',
      entityId: saved.id,
      changes: {
        thresholdPercent: {
          old: before?.thresholdPercent ?? null,
          new: saved.thresholdPercent,
        },
        isActive: { old: before?.isActive ?? null, new: saved.isActive },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  private async assertCurrenciesExist(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<void> {
    const currencies = await this.currencyRepository.find({
      where: [
        { code: fromCurrency.toUpperCase() },
        { code: toCurrency.toUpperCase() },
      ],
    });

    if (currencies.length !== 2) {
      throw new BadRequestException({
        code: 'CURRENCY_NOT_FOUND',
        message: 'One or both currency codes are not recognized',
      });
    }
  }
}
