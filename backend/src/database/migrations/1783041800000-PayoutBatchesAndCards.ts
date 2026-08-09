import { MigrationInterface, QueryRunner } from 'typeorm';

export class PayoutBatchesAndCards1783041800000 implements MigrationInterface {
  name = 'PayoutBatchesAndCards1783041800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payout_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "batchType" varchar(40) NOT NULL,
        "rail" varchar(32) NOT NULL,
        "fundingAccountId" uuid,
        "csvExportProfileId" uuid,
        "sourceId" uuid,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "providerBatchId" varchar(128),
        "reasonCodes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payout_batches_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payout_batches_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payout_batches_funding" FOREIGN KEY ("fundingAccountId")
          REFERENCES "funding_accounts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payout_batches_tenant_status"
        ON "payout_batches" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payout_batches_tenant_entity"
        ON "payout_batches" ("tenantId", "legalEntityId")
    `);

    await queryRunner.query(`
      CREATE TABLE "payout_batch_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "batchId" uuid NOT NULL,
        "sourceType" varchar(40) NOT NULL,
        "sourceId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currency" char(3) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "providerTransferId" varchar(128),
        "paymentReference" varchar(128),
        "issues" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_batch_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payout_batch_lines_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payout_batch_lines_batch" FOREIGN KEY ("batchId")
          REFERENCES "payout_batches"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payout_batch_lines_batch"
        ON "payout_batch_lines" ("tenantId", "batchId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payout_batch_lines_source"
        ON "payout_batch_lines" ("tenantId", "sourceType", "sourceId")
    `);

    await queryRunner.query(`
      CREATE TABLE "bank_feed_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "fundingAccountId" uuid NOT NULL,
        "providerTxnId" varchar(128) NOT NULL,
        "txnType" varchar(16) NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currency" char(3) NOT NULL,
        "description" text,
        "bookedAt" TIMESTAMPTZ,
        "matchStatus" varchar(32) NOT NULL DEFAULT 'unmatched',
        "matchedPayoutBatchLineId" uuid,
        "matchedCardTransactionId" uuid,
        "rawPayload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bank_feed_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_bank_feed_transactions_provider"
          UNIQUE ("tenantId", "fundingAccountId", "providerTxnId"),
        CONSTRAINT "FK_bank_feed_transactions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_bank_feed_transactions_funding" FOREIGN KEY ("fundingAccountId")
          REFERENCES "funding_accounts"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "corporate_cards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "fundingAccountId" uuid,
        "provider" varchar(32) NOT NULL,
        "externalCardId" varchar(128),
        "label" varchar(120) NOT NULL,
        "currency" char(3) NOT NULL,
        "spendLimit" numeric(15,2),
        "workerId" uuid,
        "travelRequestId" uuid,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_corporate_cards" PRIMARY KEY ("id"),
        CONSTRAINT "FK_corporate_cards_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_corporate_cards_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "card_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "corporateCardId" uuid NOT NULL,
        "providerTxnId" varchar(128) NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currency" char(3) NOT NULL,
        "merchant" varchar(255),
        "transactedAt" TIMESTAMPTZ,
        "expenseClaimId" uuid,
        "rawPayload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_card_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_card_transactions_provider"
          UNIQUE ("tenantId", "corporateCardId", "providerTxnId"),
        CONSTRAINT "FK_card_transactions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_card_transactions_card" FOREIGN KEY ("corporateCardId")
          REFERENCES "corporate_cards"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "card_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "corporate_cards"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_feed_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_batch_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_batches"`);
  }
}
