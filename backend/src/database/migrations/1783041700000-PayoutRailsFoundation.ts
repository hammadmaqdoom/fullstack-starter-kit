import { MigrationInterface, QueryRunner } from 'typeorm';

export class PayoutRailsFoundation1783041700000 implements MigrationInterface {
  name = 'PayoutRailsFoundation1783041700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "funding_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "provider" varchar(32) NOT NULL,
        "currency" char(3) NOT NULL,
        "label" varchar(120) NOT NULL,
        "externalAccountId" varchar(128),
        "bankDetails" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        CONSTRAINT "PK_funding_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_funding_accounts_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_funding_accounts_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_funding_accounts_tenant_entity"
        ON "funding_accounts" ("tenantId", "legalEntityId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_funding_accounts_tenant_provider"
        ON "funding_accounts" ("tenantId", "provider")
    `);

    await queryRunner.query(`
      CREATE TABLE "payout_rail_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "primaryRail" varchar(32) NOT NULL,
        "secondaryRail" varchar(32),
        "fallbackRail" varchar(32) NOT NULL DEFAULT 'manual_bank',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_rail_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payout_rail_profiles_tenant_entity" UNIQUE ("tenantId", "legalEntityId"),
        CONSTRAINT "FK_payout_rail_profiles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payout_rail_profiles_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payout_corridor_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "payerCountryCode" char(2) NOT NULL,
        "recipientBankCountryCode" char(2) NOT NULL,
        "primaryRail" varchar(32) NOT NULL,
        "secondaryRail" varchar(32),
        "fallbackRail" varchar(32) NOT NULL DEFAULT 'manual_bank',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_corridor_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payout_corridor_overrides_route"
          UNIQUE ("tenantId", "payerCountryCode", "recipientBankCountryCode"),
        CONSTRAINT "FK_payout_corridor_overrides_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "provider_capability_catalogs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "kind" varchar(64) NOT NULL,
        "countryCode" char(2),
        "currencyCode" char(3),
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "isAllowed" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_capability_catalogs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_provider_capability_catalogs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_provider_capability_catalogs_kind"
        ON "provider_capability_catalogs" ("tenantId", "kind")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_provider_capability_catalogs_country"
        ON "provider_capability_catalogs" ("tenantId", "kind", "countryCode")
    `);

    await queryRunner.query(`
      CREATE TABLE "csv_export_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "columns" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "includePayerFromFundingAccount" boolean NOT NULL DEFAULT true,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_csv_export_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_csv_export_profiles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_csv_export_profiles_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_csv_export_profiles_tenant_entity"
        ON "csv_export_profiles" ("tenantId", "legalEntityId")
    `);

    await queryRunner.query(`
      ALTER TABLE "expense_claims"
        ADD COLUMN IF NOT EXISTS "settlementMode" varchar(32),
        ADD COLUMN IF NOT EXISTS "payRunLineItemId" uuid
    `);
    await queryRunner.query(`
      UPDATE "expense_claims"
      SET "settlementMode" = 'export_only'
      WHERE "settlementMode" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "expense_claims"
        ALTER COLUMN "settlementMode" SET DEFAULT 'export_only'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expense_claims"
        DROP COLUMN IF EXISTS "payRunLineItemId",
        DROP COLUMN IF EXISTS "settlementMode"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "csv_export_profiles"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "provider_capability_catalogs"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_corridor_overrides"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_rail_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "funding_accounts"`);
  }
}
