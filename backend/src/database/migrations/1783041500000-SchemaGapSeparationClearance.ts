import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema gap wave 5: deepen separation_cases and clearance_items
 * (initiation metadata + clearance tenant denormalisation).
 */
export class SchemaGapSeparationClearance1783041500000
  implements MigrationInterface
{
  name = 'SchemaGapSeparationClearance1783041500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "separation_initiation_type_enum" AS ENUM (
          'resignation', 'termination', 'end_of_contract', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "separation_cases"
        ADD COLUMN IF NOT EXISTS "initiationType" "separation_initiation_type_enum"
          NOT NULL DEFAULT 'other',
        ADD COLUMN IF NOT EXISTS "noticeDate" date,
        ADD COLUMN IF NOT EXISTS "settlementNotes" text,
        ADD COLUMN IF NOT EXISTS "exitInterviewId" uuid,
        ADD COLUMN IF NOT EXISTS "letterDocumentId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "clearance_items"
        ADD COLUMN IF NOT EXISTS "tenantId" uuid
    `);

    await queryRunner.query(`
      UPDATE "clearance_items" c
      SET "tenantId" = s."tenantId"
      FROM "separation_cases" s
      WHERE c."separationCaseId" = s."id" AND c."tenantId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "clearance_items"
        ALTER COLUMN "tenantId" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "clearance_items"
          ADD CONSTRAINT "FK_clearance_items_tenant"
          FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "clearance_items"
        ADD COLUMN IF NOT EXISTS "ownerWorkerId" uuid,
        ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "isBlocking" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "clearance_items"
          ADD CONSTRAINT "FK_clearance_items_owner_worker"
          FOREIGN KEY ("ownerWorkerId")
          REFERENCES "workers"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clearance_items_tenant"
        ON "clearance_items" ("tenantId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clearance_items_tenant"`,
    );

    await queryRunner.query(`
      ALTER TABLE "clearance_items"
        DROP CONSTRAINT IF EXISTS "FK_clearance_items_owner_worker"
    `);

    await queryRunner.query(`
      ALTER TABLE "clearance_items"
        DROP COLUMN IF EXISTS "isBlocking",
        DROP COLUMN IF EXISTS "dueAt",
        DROP COLUMN IF EXISTS "ownerWorkerId"
    `);

    await queryRunner.query(`
      ALTER TABLE "clearance_items"
        DROP CONSTRAINT IF EXISTS "FK_clearance_items_tenant"
    `);

    await queryRunner.query(`
      ALTER TABLE "clearance_items"
        DROP COLUMN IF EXISTS "tenantId"
    `);

    await queryRunner.query(`
      ALTER TABLE "separation_cases"
        DROP COLUMN IF EXISTS "letterDocumentId",
        DROP COLUMN IF EXISTS "exitInterviewId",
        DROP COLUMN IF EXISTS "settlementNotes",
        DROP COLUMN IF EXISTS "noticeDate",
        DROP COLUMN IF EXISTS "initiationType"
    `);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "separation_initiation_type_enum"`,
    );
  }
}
