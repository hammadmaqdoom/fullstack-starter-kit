import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IssuedCardResult,
  ProviderCardTxn,
} from '../aspire/aspire-cards.client';

export class WiseCardsNotConfiguredError extends Error {
  constructor() {
    super('Wise cards API is not configured');
    this.name = 'WiseCardsNotConfiguredError';
  }
}

@Injectable()
export class WiseCardsClient {
  private readonly logger = new Logger(WiseCardsClient.name);

  constructor(private readonly configService: ConfigService) {}

  async issueCard(input: {
    profileId: string;
    label: string;
    currency: string;
    spendLimit: string;
  }): Promise<IssuedCardResult> {
    const { token, base } = this.requireAuth();
    const response = await fetch(`${base}/v3/profiles/${input.profileId}/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: input.label,
        currency: input.currency,
        spendingLimit: { amount: input.spendLimit, currency: input.currency },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`Wise issue card failed: ${response.status} ${body}`);
      throw new Error(`Wise issue card failed: ${response.status}`);
    }
    const json = (await response.json()) as Record<string, unknown>;
    return {
      externalCardId: String(json.id ?? `wise-card-${Date.now()}`),
      raw: json,
    };
  }

  async listTransactions(
    profileId: string,
    externalCardId: string,
  ): Promise<ProviderCardTxn[]> {
    const { token, base } = this.requireAuth();
    const response = await fetch(
      `${base}/v3/profiles/${profileId}/cards/${encodeURIComponent(externalCardId)}/transactions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Wise card transactions failed: ${response.status}`);
    }
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json)
      ? (json as Array<Record<string, unknown>>)
      : ((json as { data?: Array<Record<string, unknown>> }).data ?? []);
    return rows.map((row) => ({
      providerTxnId: String(row.id ?? ''),
      amount: Number(row.amount ?? 0).toFixed(2),
      currency: String(row.currency ?? 'SGD').toUpperCase(),
      merchant: row.merchantName != null ? String(row.merchantName) : null,
      transactedAt: row.created
        ? new Date(String(row.created))
        : null,
      raw: row,
    }));
  }

  private requireAuth(): { token: string; base: string } {
    const token = this.configService.get<string>('WISE_API_TOKEN');
    const base =
      this.configService.get<string>('WISE_API_BASE') ??
      'https://api.transferwise.com';
    if (!token) {
      throw new WiseCardsNotConfiguredError();
    }
    return { token, base: base.replace(/\/$/, '') };
  }
}
