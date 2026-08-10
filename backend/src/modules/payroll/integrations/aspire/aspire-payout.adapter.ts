import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FundingAccountEntity } from '../../entities/funding-account.entity';
import type { PayoutBatchLineEntity } from '../../entities/payout-batch-line.entity';
import type { PayoutBatchEntity } from '../../entities/payout-batch.entity';
import {
  AspireNotConfiguredError,
  PayoutAdapter,
  PayoutAdapterSubmitResult,
} from '../payout-adapter.types';

type TokenCache = { accessToken: string; expiresAtMs: number };

/**
 * Aspire Payout adapter (payroll / supplier payouts).
 * Auth: client credentials → POST /public/v1/login (900s TTL).
 * Every payout POST must send Idempotency-Key = payout_batch_line.id.
 */
@Injectable()
export class AspirePayoutAdapter implements PayoutAdapter {
  private readonly logger = new Logger(AspirePayoutAdapter.name);
  private tokenCache: TokenCache | null = null;

  constructor(private readonly configService: ConfigService) {}

  async submitBatch(
    batch: PayoutBatchEntity,
    lines: PayoutBatchLineEntity[],
    funding: FundingAccountEntity,
  ): Promise<PayoutAdapterSubmitResult> {
    const clientId = this.configService.get<string>('ASPIRE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ASPIRE_CLIENT_SECRET');
    const baseUrl =
      this.configService.get<string>('ASPIRE_API_BASE') ??
      'https://api.aspireapp.com/public/v1';

    if (!clientId || !clientSecret) {
      throw new AspireNotConfiguredError();
    }

    const token = await this.getAccessToken(baseUrl, clientId, clientSecret);
    const lineExternalIds: Record<string, string> = {};

    for (const line of lines) {
      if (line.status === 'skipped') continue;
      const externalId = await this.createPayout(baseUrl, token, {
        idempotencyKey: line.id,
        amount: line.amount,
        currency: line.currency,
        sourceAccountId: funding.externalAccountId,
        reference: `polaris-${batch.id.slice(0, 8)}-${line.id.slice(0, 8)}`,
        workerId: line.workerId,
      });
      lineExternalIds[line.id] = externalId;
    }

    return {
      providerBatchId: `aspire-batch-${batch.id}`,
      lineExternalIds,
    };
  }

  private async getAccessToken(
    baseUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAtMs > Date.now() + 5_000) {
      return this.tokenCache.accessToken;
    }

    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      this.logger.error(`Aspire login failed: ${response.status}`);
      throw new Error(`Aspire auth failed with status ${response.status}`);
    }

    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!body.access_token) {
      throw new Error('Aspire auth response missing access_token');
    }

    this.tokenCache = {
      accessToken: body.access_token,
      expiresAtMs: Date.now() + (body.expires_in ?? 900) * 1000,
    };
    return body.access_token;
  }

  private async createPayout(
    baseUrl: string,
    token: string,
    input: {
      idempotencyKey: string;
      amount: string;
      currency: string;
      sourceAccountId: string | null;
      reference: string;
      workerId: string;
    },
  ): Promise<string> {
    // Endpoint path is partner-specific; use transfers as the public surface.
    const response = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        source_account_id: input.sourceAccountId,
        reference: input.reference,
        metadata: { workerId: input.workerId, polarisLineId: input.idempotencyKey },
      }),
    });

    if (response.status === 401) {
      this.tokenCache = null;
      throw new Error('Aspire token expired during payout');
    }

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Aspire payout failed: ${response.status} ${text}`);
      throw new Error(`Aspire payout failed with status ${response.status}`);
    }

    const body = (await response.json()) as { id?: string; data?: { id?: string } };
    return body.id ?? body.data?.id ?? input.idempotencyKey;
  }
}
