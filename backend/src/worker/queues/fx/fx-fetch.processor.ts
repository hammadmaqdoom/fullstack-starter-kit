import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Job, Queue } from '@/constants/job.constant';
import {
  FetchStatus,
  RateSource,
  RateStatus,
  RateType,
} from '@/modules/country-config/enums/country-config.enum';
import {
  ExchangeRateEntity,
  ExchangeRateFetchBatchEntity,
} from '@/modules/country-config/entities/exchange-rate.entity';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { Repository } from 'typeorm';

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app/latest';
const REPORTING_CURRENCY = 'USD';
const TARGET_CURRENCIES = ['PKR', 'AED', 'SGD'];

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

@Injectable()
@Processor(Queue.Fx)
export class FxFetchProcessor extends WorkerHost {
  private readonly logger = new Logger(FxFetchProcessor.name);

  constructor(
    @InjectRepository(ExchangeRateFetchBatchEntity)
    private readonly batchRepository: Repository<ExchangeRateFetchBatchEntity>,
    @InjectRepository(ExchangeRateEntity)
    private readonly exchangeRateRepository: Repository<ExchangeRateEntity>,
  ) {
    super();
  }

  async process(job: BullJob): Promise<void> {
    if (job.name !== Job.Fx.FetchRates) {
      return;
    }

    await this.fetchFrankfurterRates();
  }

  private async fetchFrankfurterRates(): Promise<void> {
    const batch = await this.batchRepository.save(
      this.batchRepository.create({
        tenantId: DIGITARO_TENANT_ID,
        source: 'frankfurter',
        status: FetchStatus.SUCCESS,
      }),
    );

    try {
      const url = `${FRANKFURTER_BASE_URL}?from=${REPORTING_CURRENCY}&to=${TARGET_CURRENCIES.join(',')}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Frankfurter API returned ${response.status}`);
      }

      const payload = (await response.json()) as FrankfurterResponse;
      let savedCount = 0;

      for (const [toCurrency, rate] of Object.entries(payload.rates)) {
        await this.exchangeRateRepository.save(
          this.exchangeRateRepository.create({
            tenantId: DIGITARO_TENANT_ID,
            fromCurrency: REPORTING_CURRENCY,
            toCurrency,
            rate: rate.toFixed(8),
            rateType: RateType.SPOT,
            effectiveFrom: payload.date,
            source: RateSource.FRANKFURTER,
            status: RateStatus.ACTIVE,
            apiFetchBatchId: batch.id,
            approvedBy: null,
          }),
        );
        savedCount += 1;
      }

      batch.status =
        savedCount === TARGET_CURRENCIES.length
          ? FetchStatus.SUCCESS
          : FetchStatus.PARTIAL;
      await this.batchRepository.save(batch);

      this.logger.log(
        `Frankfurter FX fetch stored ${savedCount} rates for ${payload.date}`,
      );
    } catch (error) {
      batch.status = FetchStatus.FAILED;
      batch.errorMessage =
        error instanceof Error ? error.message : 'Unknown FX fetch error';
      await this.batchRepository.save(batch);
      this.logger.error(`Frankfurter FX fetch failed: ${batch.errorMessage}`);
      throw error;
    }
  }
}
