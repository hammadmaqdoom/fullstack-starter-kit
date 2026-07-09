import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCountryConfig1783037000000 implements MigrationInterface {
  name = 'CreateCountryConfig1783037000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payroll_route_enum" AS ENUM (
        'employee_pay_run', 'contractor_invoice', 'excluded'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "rate_type_enum" AS ENUM ('spot', 'monthly_avg', 'budget')
    `);
    await queryRunner.query(`
      CREATE TYPE "rate_source_enum" AS ENUM (
        'frankfurter', 'manual_override', 'computed_avg'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "rate_status_enum" AS ENUM ('pending', 'active', 'superseded')
    `);
    await queryRunner.query(`
      CREATE TYPE "fetch_status_enum" AS ENUM ('success', 'partial', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "currency_codes" (
        "code" character(3) NOT NULL,
        "name" character varying(100) NOT NULL,
        "decimalPlaces" integer NOT NULL DEFAULT 2,
        "symbol" character varying(10),
        CONSTRAINT "PK_currency_codes" PRIMARY KEY ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "country_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "configJson" jsonb NOT NULL DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_country_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_country_configs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_country_configs_tenant_code"
        ON "country_configs" ("tenantId", "countryCode")
    `);

    await queryRunner.query(`
      CREATE TABLE "employment_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "displayName" character varying(100) NOT NULL,
        "isFte" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_employment_types" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employment_types_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_employment_types_tenant_code"
        ON "employment_types" ("tenantId", "code")
    `);

    await queryRunner.query(`
      CREATE TABLE "employment_type_country_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "employmentTypeId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "leaveEnabled" boolean NOT NULL DEFAULT true,
        "checkInRequired" boolean NOT NULL DEFAULT true,
        "payrollRoute" "payroll_route_enum" NOT NULL DEFAULT 'employee_pay_run',
        "performanceIncluded" boolean NOT NULL DEFAULT true,
        "configJson" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_employment_type_country_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_etc_configs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_etc_configs_employment_type" FOREIGN KEY ("employmentTypeId")
          REFERENCES "employment_types"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_etc_configs_tenant_type_country"
        ON "employment_type_country_configs" ("tenantId", "employmentTypeId", "countryCode")
    `);

    await queryRunner.query(`
      CREATE TABLE "country_currency_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "defaultCurrency" character(3) NOT NULL,
        "allowedCurrencies" character(3)[] NOT NULL,
        CONSTRAINT "PK_country_currency_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_country_currency_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_country_currency_default" FOREIGN KEY ("defaultCurrency")
          REFERENCES "currency_codes"("code") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_country_currency_tenant_country"
        ON "country_currency_configs" ("tenantId", "countryCode")
    `);

    await queryRunner.query(`
      CREATE TABLE "exchange_rate_fetch_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "source" character varying(50) NOT NULL DEFAULT 'frankfurter',
        "status" "fetch_status_enum" NOT NULL,
        "errorMessage" text,
        CONSTRAINT "PK_exchange_rate_fetch_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exchange_rate_fetch_batches_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "exchange_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "fromCurrency" character(3) NOT NULL,
        "toCurrency" character(3) NOT NULL,
        "rate" numeric(18,8) NOT NULL,
        "rateType" "rate_type_enum" NOT NULL DEFAULT 'spot',
        "effectiveFrom" date NOT NULL,
        "source" "rate_source_enum" NOT NULL DEFAULT 'frankfurter',
        "status" "rate_status_enum" NOT NULL DEFAULT 'active',
        "apiFetchBatchId" uuid,
        "approvedBy" uuid,
        CONSTRAINT "PK_exchange_rates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exchange_rates_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_exchange_rates_from" FOREIGN KEY ("fromCurrency")
          REFERENCES "currency_codes"("code") ON DELETE RESTRICT,
        CONSTRAINT "FK_exchange_rates_to" FOREIGN KEY ("toCurrency")
          REFERENCES "currency_codes"("code") ON DELETE RESTRICT,
        CONSTRAINT "FK_exchange_rates_batch" FOREIGN KEY ("apiFetchBatchId")
          REFERENCES "exchange_rate_fetch_batches"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_exchange_rates_unique_pair"
        ON "exchange_rates" ("tenantId", "fromCurrency", "toCurrency", "rateType", "effectiveFrom")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exchange_rates_lookup"
        ON "exchange_rates" ("tenantId", "fromCurrency", "toCurrency", "effectiveFrom")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exchange_rates"`);
    await queryRunner.query(`DROP TABLE "exchange_rate_fetch_batches"`);
    await queryRunner.query(`DROP TABLE "country_currency_configs"`);
    await queryRunner.query(`DROP TABLE "employment_type_country_configs"`);
    await queryRunner.query(`DROP TABLE "employment_types"`);
    await queryRunner.query(`DROP TABLE "country_configs"`);
    await queryRunner.query(`DROP TABLE "currency_codes"`);
    await queryRunner.query(`DROP TYPE "fetch_status_enum"`);
    await queryRunner.query(`DROP TYPE "rate_status_enum"`);
    await queryRunner.query(`DROP TYPE "rate_source_enum"`);
    await queryRunner.query(`DROP TYPE "rate_type_enum"`);
    await queryRunner.query(`DROP TYPE "payroll_route_enum"`);
  }
}
