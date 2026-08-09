import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema gap wave 1: tenant_currencies, legal_entity_division_mappings,
 * legal_entity_currencies, legal_entity_signatories, signing_certificates,
 * and legal_entities logo / page numbering / payroll export profile FK.
 */
export class SchemaGapLegalEntityCurrency1783041100000
  implements MigrationInterface
{
  name = 'SchemaGapLegalEntityCurrency1783041100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "legal_entities"
        ADD COLUMN IF NOT EXISTS "logoBlobUrl" character varying(500),
        ADD COLUMN IF NOT EXISTS "pageNumberingEnabled" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "payrollExportProfileId" uuid
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "legal_entities"
          ADD CONSTRAINT "FK_legal_entities_payroll_export_profile"
          FOREIGN KEY ("payrollExportProfileId")
          REFERENCES "finance_export_profiles"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_currencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "currencyCode" character(3) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "isReportingCurrency" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_currencies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_currencies_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tenant_currencies_currency" FOREIGN KEY ("currencyCode")
          REFERENCES "currency_codes"("code") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_currencies_unique"
        ON "tenant_currencies" ("tenantId", "currencyCode")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_entity_division_mappings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "divisionId" uuid,
        "countryCode" character(2) NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "priority" integer NOT NULL DEFAULT 100,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legal_entity_division_mappings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ledm_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ledm_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ledm_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_legal_entity_division_mappings_unique"
        ON "legal_entity_division_mappings"
        ("tenantId", "legalEntityId", "divisionId", "countryCode", "effectiveFrom")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_legal_entity_division_mappings_lookup"
        ON "legal_entity_division_mappings" ("tenantId", "countryCode", "divisionId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_entity_currencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "currencyCode" character(3) NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legal_entity_currencies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lec_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_lec_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lec_currency" FOREIGN KEY ("currencyCode")
          REFERENCES "currency_codes"("code") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_legal_entity_currencies_unique"
        ON "legal_entity_currencies" ("tenantId", "legalEntityId", "currencyCode")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_entity_signatories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "workerId" uuid,
        "name" character varying(255) NOT NULL,
        "title" character varying(100) NOT NULL,
        "email" character varying(255),
        "signatureImageBlobUrl" character varying(500),
        "isDefault" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legal_entity_signatories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_les_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_les_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_les_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_legal_entity_signatories_entity"
        ON "legal_entity_signatories" ("tenantId", "legalEntityId")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "signing_certificate_status_enum" AS ENUM (
          'active', 'expiring_soon', 'expired', 'revoked'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "signing_certificates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "keyVaultSecretName" character varying(255) NOT NULL,
        "certificateSubject" character varying(255) NOT NULL,
        "issuer" character varying(255),
        "serialNumber" character varying(100),
        "validFrom" TIMESTAMPTZ NOT NULL,
        "validTo" TIMESTAMPTZ NOT NULL,
        "thumbprint" character varying(64),
        "status" "signing_certificate_status_enum" NOT NULL DEFAULT 'active',
        "lastReviewedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signing_certificates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_signing_certificates_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_signing_certificates_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_signing_certificates_entity"
        ON "signing_certificates" ("tenantId", "legalEntityId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_signing_certificates_entity"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "signing_certificates"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "signing_certificate_status_enum"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_legal_entity_signatories_entity"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_entity_signatories"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_legal_entity_currencies_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_entity_currencies"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_legal_entity_division_mappings_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_legal_entity_division_mappings_unique"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "legal_entity_division_mappings"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenant_currencies_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_currencies"`);

    await queryRunner.query(`
      ALTER TABLE "legal_entities"
        DROP CONSTRAINT IF EXISTS "FK_legal_entities_payroll_export_profile"
    `);
    await queryRunner.query(`
      ALTER TABLE "legal_entities"
        DROP COLUMN IF EXISTS "payrollExportProfileId",
        DROP COLUMN IF EXISTS "pageNumberingEnabled",
        DROP COLUMN IF EXISTS "logoBlobUrl"
    `);
  }
}
