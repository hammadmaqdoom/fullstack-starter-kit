import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema gap wave 2: office_locations, worker profile columns,
 * worker_statutory_ids (backfill from statutoryFields JSONB then drop),
 * worker_bank_accounts, employee_skills, employment_records.
 */
export class SchemaGapCoreHrProfile1783041200000 implements MigrationInterface {
  name = 'SchemaGapCoreHrProfile1783041200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "office_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "countryCode" character(2) NOT NULL,
        "address" text,
        "latitude" numeric(10,7) NOT NULL,
        "longitude" numeric(10,7) NOT NULL,
        "geofenceRadiusM" integer NOT NULL DEFAULT 200,
        "ipAllowlist" inet[],
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_office_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_office_locations_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_office_locations_tenant_country"
        ON "office_locations" ("tenantId", "countryCode")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "worker_statutory_ids" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "fieldKey" character varying(50) NOT NULL,
        "fieldValue" character varying(255) NOT NULL,
        "expiryDate" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_worker_statutory_ids" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_statutory_ids_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_worker_statutory_ids_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_worker_statutory_ids_unique"
        ON "worker_statutory_ids" ("tenantId", "workerId", "fieldKey")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_worker_statutory_ids_worker"
        ON "worker_statutory_ids" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      INSERT INTO "worker_statutory_ids"
        ("id", "tenantId", "workerId", "countryCode", "fieldKey", "fieldValue", "expiryDate", "createdAt", "updatedAt")
      SELECT uuid_generate_v4(), w."tenantId", w."id", w."countryCode", kv.key, kv.value, NULL, now(), now()
      FROM "workers" w
      CROSS JOIN LATERAL jsonb_each_text(COALESCE(w."statutoryFields", '{}'::jsonb)) AS kv(key, value)
      WHERE trim(kv.value) <> ''
    `);

    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD COLUMN IF NOT EXISTS "officeLocationId" uuid,
        ADD COLUMN IF NOT EXISTS "jobTitle" character varying(150),
        ADD COLUMN IF NOT EXISTS "emergencyContactName" character varying(150),
        ADD COLUMN IF NOT EXISTS "emergencyContactPhone" character varying(50),
        ADD COLUMN IF NOT EXISTS "emergencyContactRelation" character varying(80),
        ADD COLUMN IF NOT EXISTS "addressLine1" character varying(255),
        ADD COLUMN IF NOT EXISTS "addressLine2" character varying(255),
        ADD COLUMN IF NOT EXISTS "city" character varying(100),
        ADD COLUMN IF NOT EXISTS "stateProvince" character varying(100),
        ADD COLUMN IF NOT EXISTS "postalCode" character varying(20),
        ADD COLUMN IF NOT EXISTS "addressCountryCode" character(2)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "workers"
          ADD CONSTRAINT "FK_workers_office_location"
          FOREIGN KEY ("officeLocationId")
          REFERENCES "office_locations"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workers_office_location"
        ON "workers" ("tenantId", "officeLocationId")
    `);

    await queryRunner.query(`
      ALTER TABLE "workers" DROP COLUMN IF EXISTS "statutoryFields"
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "worker_bank_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "bankName" character varying(255) NOT NULL,
        "accountHolderName" character varying(255),
        "accountNumberEncrypted" bytea NOT NULL,
        "ibanEncrypted" bytea,
        "swiftBic" character varying(20),
        "bankCountryCode" character(2) NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_worker_bank_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_bank_accounts_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_worker_bank_accounts_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_worker_bank_accounts_worker"
        ON "worker_bank_accounts" ("tenantId", "workerId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_worker_bank_accounts_one_primary"
        ON "worker_bank_accounts" ("tenantId", "workerId")
        WHERE "isPrimary" = true
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "skill_visibility_enum" AS ENUM ('private', 'manager', 'directory');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employee_skills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "skillName" character varying(100) NOT NULL,
        "proficiency" character varying(50),
        "visibility" "skill_visibility_enum" NOT NULL DEFAULT 'manager',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_skills" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employee_skills_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_employee_skills_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_employee_skills_unique"
        ON "employee_skills" ("tenantId", "workerId", "skillName")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "employment_record_change_type_enum" AS ENUM (
          'hire', 'promotion', 'transfer', 'title_change', 'compensation_revision', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employment_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "title" character varying(150) NOT NULL,
        "departmentId" uuid,
        "divisionId" uuid,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "changeType" "employment_record_change_type_enum" NOT NULL DEFAULT 'other',
        "notes" text,
        "sourceDocumentId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employment_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employment_records_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_employment_records_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employment_records_department" FOREIGN KEY ("departmentId")
          REFERENCES "departments"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_employment_records_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_employment_records_worker"
        ON "employment_records" ("tenantId", "workerId", "effectiveFrom")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_employment_records_worker"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "employment_records"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "employment_record_change_type_enum"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employee_skills_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_skills"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "skill_visibility_enum"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_worker_bank_accounts_one_primary"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_worker_bank_accounts_worker"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_bank_accounts"`);

    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD COLUMN IF NOT EXISTS "statutoryFields" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workers_office_location"`,
    );
    await queryRunner.query(`
      ALTER TABLE "workers"
        DROP CONSTRAINT IF EXISTS "FK_workers_office_location"
    `);
    await queryRunner.query(`
      ALTER TABLE "workers"
        DROP COLUMN IF EXISTS "addressCountryCode",
        DROP COLUMN IF EXISTS "postalCode",
        DROP COLUMN IF EXISTS "stateProvince",
        DROP COLUMN IF EXISTS "city",
        DROP COLUMN IF EXISTS "addressLine2",
        DROP COLUMN IF EXISTS "addressLine1",
        DROP COLUMN IF EXISTS "emergencyContactRelation",
        DROP COLUMN IF EXISTS "emergencyContactPhone",
        DROP COLUMN IF EXISTS "emergencyContactName",
        DROP COLUMN IF EXISTS "jobTitle",
        DROP COLUMN IF EXISTS "officeLocationId"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_worker_statutory_ids_worker"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_worker_statutory_ids_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_statutory_ids"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_office_locations_tenant_country"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "office_locations"`);
  }
}
