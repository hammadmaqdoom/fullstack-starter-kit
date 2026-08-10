import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FundingAccountEntity } from '../../entities/funding-account.entity';
import type { PayoutBatchLineEntity } from '../../entities/payout-batch-line.entity';
import type { PayoutBatchEntity } from '../../entities/payout-batch.entity';
import {
  PayoutAdapter,
  PayoutAdapterSubmitResult,
  WiseNotConfiguredError,
} from '../payout-adapter.types';

/**
 * Wise enterprise / business payouts via quote → transfer (batch group when N>1).
 * Uses personal API token or partner OAuth token from env.
 */
@Injectable()
export class WisePayoutAdapter implements PayoutAdapter {
  private readonly logger = new Logger(WisePayoutAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async submitBatch(
    batch: PayoutBatchEntity,
    lines: PayoutBatchLineEntity[],
    funding: FundingAccountEntity,
  ): Promise<PayoutAdapterSubmitResult> {
    const token = this.configService.get<string>('WISE_API_TOKEN');
    const profileId = this.configService.get<string>('WISE_PROFILE_ID');
    const baseUrl =
      this.configService.get<string>('WISE_API_BASE') ??
      'https://api.wise.com';

    if (!token || !profileId) {
      throw new WiseNotConfiguredError();
    }

    const payable = lines.filter((l) => l.status !== 'skipped');
    const lineExternalIds: Record<string, string> = {};

    if (payable.length > 1) {
      const batchGroupId = await this.createBatchGroup(
        baseUrl,
        token,
        profileId,
        funding.currency,
        batch.id,
      );
      for (const line of payable) {
        const transferId = await this.addBatchTransfer(
          baseUrl,
          token,
          profileId,
          batchGroupId,
          line,
          funding,
        );
        lineExternalIds[line.id] = String(transferId);
      }
      await this.completeBatchGroup(baseUrl, token, profileId, batchGroupId);
      await this.fundBatchGroup(baseUrl, token, profileId, batchGroupId);
      return { providerBatchId: batchGroupId, lineExternalIds };
    }

    if (payable.length === 1) {
      const line = payable[0];
      const transferId = await this.createSingleTransfer(
        baseUrl,
        token,
        profileId,
        line,
        funding,
      );
      lineExternalIds[line.id] = String(transferId);
      return {
        providerBatchId: `wise-${transferId}`,
        lineExternalIds,
      };
    }

    return { providerBatchId: `wise-empty-${batch.id}`, lineExternalIds };
  }

  private headers(token: string): HeadersInit {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async createBatchGroup(
    baseUrl: string,
    token: string,
    profileId: string,
    sourceCurrency: string,
    name: string,
  ): Promise<string> {
    const response = await fetch(
      `${baseUrl}/v3/profiles/${profileId}/batch-groups`,
      {
        method: 'POST',
        headers: this.headers(token),
        body: JSON.stringify({ sourceCurrency, name: `Polaris ${name.slice(0, 8)}` }),
      },
    );
    if (!response.ok) {
      throw new Error(`Wise batch group create failed: ${response.status}`);
    }
    const body = (await response.json()) as { id: string };
    return body.id;
  }

  private async addBatchTransfer(
    baseUrl: string,
    token: string,
    profileId: string,
    batchGroupId: string,
    line: PayoutBatchLineEntity,
    funding: FundingAccountEntity,
  ): Promise<number> {
    const quoteId = await this.createQuote(
      baseUrl,
      token,
      profileId,
      funding.currency,
      line.currency,
      line.amount,
    );
    const response = await fetch(
      `${baseUrl}/v3/profiles/${profileId}/batch-groups/${batchGroupId}/transfers`,
      {
        method: 'POST',
        headers: this.headers(token),
        body: JSON.stringify({
          quoteUuid: quoteId,
          customerTransactionId: line.id,
          details: { reference: `Polaris ${line.id.slice(0, 8)}` },
        }),
      },
    );
    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Wise batch transfer failed: ${text}`);
      throw new Error(`Wise batch transfer failed: ${response.status}`);
    }
    const body = (await response.json()) as { id: number };
    return body.id;
  }

  private async completeBatchGroup(
    baseUrl: string,
    token: string,
    profileId: string,
    batchGroupId: string,
  ): Promise<void> {
    const response = await fetch(
      `${baseUrl}/v3/profiles/${profileId}/batch-groups/${batchGroupId}`,
      {
        method: 'PATCH',
        headers: this.headers(token),
        body: JSON.stringify({ status: 'COMPLETED' }),
      },
    );
    if (!response.ok) {
      throw new Error(`Wise batch complete failed: ${response.status}`);
    }
  }

  private async fundBatchGroup(
    baseUrl: string,
    token: string,
    profileId: string,
    batchGroupId: string,
  ): Promise<void> {
    const response = await fetch(
      `${baseUrl}/v3/profiles/${profileId}/batch-payments/${batchGroupId}/payments`,
      {
        method: 'POST',
        headers: this.headers(token),
        body: JSON.stringify({ type: 'BALANCE' }),
      },
    );
    if (!response.ok) {
      throw new Error(`Wise batch fund failed: ${response.status}`);
    }
  }

  private async createSingleTransfer(
    baseUrl: string,
    token: string,
    profileId: string,
    line: PayoutBatchLineEntity,
    funding: FundingAccountEntity,
  ): Promise<number> {
    const quoteId = await this.createQuote(
      baseUrl,
      token,
      profileId,
      funding.currency,
      line.currency,
      line.amount,
    );
    const response = await fetch(`${baseUrl}/v3/transfers`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({
        quoteUuid: quoteId,
        customerTransactionId: line.id,
        details: { reference: `Polaris ${line.id.slice(0, 8)}` },
      }),
    });
    if (!response.ok) {
      throw new Error(`Wise transfer create failed: ${response.status}`);
    }
    const body = (await response.json()) as { id: number };
    await fetch(
      `${baseUrl}/v3/profiles/${profileId}/transfers/${body.id}/payments`,
      {
        method: 'POST',
        headers: this.headers(token),
        body: JSON.stringify({ type: 'BALANCE' }),
      },
    );
    return body.id;
  }

  private async createQuote(
    baseUrl: string,
    token: string,
    profileId: string,
    sourceCurrency: string,
    targetCurrency: string,
    sourceAmount: string,
  ): Promise<string> {
    const response = await fetch(
      `${baseUrl}/v3/profiles/${profileId}/quotes`,
      {
        method: 'POST',
        headers: this.headers(token),
        body: JSON.stringify({
          sourceCurrency,
          targetCurrency,
          sourceAmount: Number(sourceAmount),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Wise quote failed: ${response.status}`);
    }
    const body = (await response.json()) as { id: string };
    return body.id;
  }
}
