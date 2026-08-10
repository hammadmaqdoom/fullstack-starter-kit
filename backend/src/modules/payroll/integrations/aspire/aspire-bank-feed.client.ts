import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AspireBankFeedTxn = {
  providerTxnId: string;
  txnType: 'credit' | 'debit';
  amount: string;
  currency: string;
  description: string | null;
  bookedAt: Date | null;
  raw: Record<string, unknown>;
};

export class AspireBankFeedNotConfiguredError extends Error {
  constructor() {
    super('Aspire bank feed is not configured (ASPIRE_CLIENT_ID / SECRET)');
    this.name = 'AspireBankFeedNotConfiguredError';
  }
}

/**
 * Best-effort Aspire Transactions / Bank Feeds client. Partner OpenAPI paths
 * vary; fail closed when credentials missing.
 */
@Injectable()
export class AspireBankFeedClient {
  private readonly logger = new Logger(AspireBankFeedClient.name);

  constructor(private readonly configService: ConfigService) {}

  async listTransactions(input: {
    externalAccountId: string;
    since?: Date;
  }): Promise<AspireBankFeedTxn[]> {
    const clientId = this.configService.get<string>('ASPIRE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ASPIRE_CLIENT_SECRET');
    const base =
      this.configService.get<string>('ASPIRE_API_BASE') ??
      'https://api.aspireapp.com';
    if (!clientId || !clientSecret) {
      throw new AspireBankFeedNotConfiguredError();
    }

    const token = await this.fetchToken(base, clientId, clientSecret);
    const url = new URL(`${base.replace(/\/$/, '')}/v1/transactions`);
    url.searchParams.set('account_id', input.externalAccountId);
    if (input.since) {
      url.searchParams.set('from', input.since.toISOString());
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`Aspire bank feed list failed: ${response.status} ${body}`);
      throw new Error(`Aspire bank feed list failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    const rows = payload.data ?? [];
    return rows.map((row) => this.mapTxn(row));
  }

  private mapTxn(row: Record<string, unknown>): AspireBankFeedTxn {
    const rawType = String(row.type ?? row.txn_type ?? 'debit').toLowerCase();
    const txnType: 'credit' | 'debit' = rawType.includes('credit')
      ? 'credit'
      : 'debit';
    const abs = Math.abs(Number(row.amount ?? row.amount_value ?? 0));
    const signed = txnType === 'credit' ? abs : -abs;
    const booked =
      row.booked_at ?? row.created_at ?? row.transaction_date ?? null;
    return {
      providerTxnId: String(row.id ?? row.transaction_id ?? ''),
      txnType,
      amount: signed.toFixed(2),
      currency: String(row.currency ?? row.currency_code ?? 'SGD').toUpperCase(),
      description:
        row.description != null
          ? String(row.description)
          : row.reference != null
            ? String(row.reference)
            : null,
      bookedAt: booked ? new Date(String(booked)) : null,
      raw: row,
    };
  }

  private async fetchToken(
    base: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
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
      throw new AspireBankFeedNotConfiguredError();
    }
    const json = (await response.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new AspireBankFeedNotConfiguredError();
    }
    return json.access_token;
  }
}
