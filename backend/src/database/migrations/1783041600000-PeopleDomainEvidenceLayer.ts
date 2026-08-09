import { MigrationInterface, QueryRunner } from 'typeorm';

export class PeopleDomainEvidenceLayer1783041600000
  implements MigrationInterface
{
  name = 'PeopleDomainEvidenceLayer1783041600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "control_domain_enum" AS ENUM (
        'people', 'access', 'policy', 'privacy', 'process'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "control_frequency_enum" AS ENUM (
        'continuous', 'daily', 'weekly', 'quarterly', 'manual'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "control_owner_role_enum" AS ENUM (
        'people_ops', 'it_admin', 'super_admin', 'shared'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "control_test_result_enum" AS ENUM (
        'pass', 'fail', 'manual', 'error', 'skipped'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "control_test_trigger_enum" AS ENUM (
        'schedule', 'manual', 'api'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "compliance_programme" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "evidenceWindowStart" date,
        "targetFrameworks" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "nextAuditTargetDate" date,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_compliance_programme" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_compliance_programme_tenant" UNIQUE ("tenantId"),
        CONSTRAINT "FK_compliance_programme_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "compliance_controls" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" varchar(64) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "domain" "control_domain_enum" NOT NULL,
        "ownerRole" "control_owner_role_enum" NOT NULL,
        "frequency" "control_frequency_enum" NOT NULL,
        "inScope" boolean NOT NULL DEFAULT true,
        "testAdapterKey" varchar(64),
        "sortOrder" int NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_compliance_controls" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_compliance_controls_tenant_code" UNIQUE ("tenantId", "code"),
        CONSTRAINT "FK_compliance_controls_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "control_framework_maps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "controlId" uuid NOT NULL,
        "framework" varchar(32) NOT NULL,
        "externalRef" varchar(128) NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_control_framework_maps" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_control_framework_maps_tenant_ctrl_fw_ref"
          UNIQUE ("tenantId", "controlId", "framework", "externalRef"),
        CONSTRAINT "FK_control_framework_maps_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_control_framework_maps_control" FOREIGN KEY ("controlId")
          REFERENCES "compliance_controls"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "control_test_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "controlId" uuid NOT NULL,
        "ranAt" TIMESTAMPTZ NOT NULL,
        "triggeredBy" "control_test_trigger_enum" NOT NULL,
        "actorUserId" uuid,
        "result" "control_test_result_enum" NOT NULL,
        "summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "evidenceRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_control_test_runs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_control_test_runs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_control_test_runs_control" FOREIGN KEY ("controlId")
          REFERENCES "compliance_controls"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_control_test_runs_tenant_control_ran"
        ON "control_test_runs" ("tenantId", "controlId", "ranAt" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "control_evidence_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "controlId" uuid NOT NULL,
        "label" varchar(255) NOT NULL,
        "urlOrPath" text NOT NULL,
        "collectedAt" TIMESTAMPTZ NOT NULL,
        "collectedBy" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_control_evidence_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_control_evidence_links_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_control_evidence_links_control" FOREIGN KEY ("controlId")
          REFERENCES "compliance_controls"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_control_evidence_links_tenant_control"
        ON "control_evidence_links" ("tenantId", "controlId")
    `);

    await queryRunner.query(`
      ALTER TABLE "training_courses"
        ADD COLUMN "countsTowardAwarenessControl" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TYPE "compliance_alert_type_enum"
        ADD VALUE 'control_test_fail'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "training_courses"
        DROP COLUMN IF EXISTS "countsTowardAwarenessControl"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "control_evidence_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "control_test_runs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "control_framework_maps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "compliance_controls"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "compliance_programme"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "control_test_trigger_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "control_test_result_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "control_owner_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "control_frequency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "control_domain_enum"`);
    // Note: cannot easily remove enum value control_test_fail from PostgreSQL
  }
}
