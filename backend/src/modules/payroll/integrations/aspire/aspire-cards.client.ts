import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type IssuedCardResult = {
  externalCardId: string;
  raw: Record<string, unknown>;
};

export type ProviderCardTxn = {
  providerTxnId: string;
  amount: string;
  currency: string;
  merchant: string | null;
  transactedAt: Date | null;
  raw: Record<string, unknown>;
};

export class AspireCardsNotConfiguredError extends Error {
  constructor() {
    super('Aspire cards API is not configured');
    this.name = 'AspireCardsNotConfiguredError';
  }
}

@Injectable()
export class AspireCardsClient {
  private readonly logger = new Logger(AspireCardsClient.name);

  constructor(private readonly configService: ConfigService) {}

  async issueCard(input: {
    externalAccountId: string;
    label: string;
    currency: string;
    spendLimit: string;
  }): Promise<IssuedCardResult> {
    const { token, base } = await this.requireAuth();
    const response = await fetch(`${base}/v1/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_id: input.externalAccountId,
        label: input.label,
        currency: input.currency,
        spend_limit: input.spendLimit,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`Aspire issue card failed: ${response.status} ${body}`);
      throw new Error(`Aspire issue card failed: ${response.status}`);
    }
    const json = (await response.json()) as Record<string, unknown>;
    const data = (json.data as Record<string, unknown>) ?? json;
    return {
      externalCardId: String(data.id ?? `aspire-card-${Date.now()}`),
      raw: data,
    };
  }

  async listTransactions(externalCardId: string): Promise<ProviderCardTxn[]> {
    const { token, base } = await this.requireAuth();
    const response = await fetch(
      `${base}/v1/cards/${encodeURIComponent(externalCardId)}/transactions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Aspire card transactions failed: ${response.status}`);
    }
    const json = (await response.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    return (json.data ?? []).map((row) => ({
      providerTxnId: String(row.id ?? ''),
      amount: Number(row.amount ?? 0).toFixed(2),
      currency: String(row.currency ?? 'SGD').toUpperCase(),
      merchant: row.merchant != null ? String(row.merchant) : null,
      transactedAt: row.transacted_at
        ? new Date(String(row.transacted_at))
        : null,
      raw: row,
    }));
  }

  private async requireAuth(): Promise<{ token: string; base: string }> {
    const clientId = this.configService.get<string>('ASPIRE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ASPIRE_CLIENT_SECRET');
    const base =
      this.configService.get<string>('ASPIRE_API_BASE') ??
      'https://api.aspireapp.com';
    if (!clientId || !clientSecret) {
      throw new AspireCardsNotConfiguredError();
    }
    const response = await fetch(`${base.replace(/\/$/, '')}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!response.ok) {
      throw new AspireCardsNotConfiguredError();
    }
    const json = (await response.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new AspireCardsNotConfiguredError();
    }
    return { token: json.access_token, base: base.replace(/\/$/, '') };
  }
}
