import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema gap wave 3: work_week_patterns, company_closures, staff_calendar_days;
 * alter attendance_punches, attendance_day_summaries, leave_requests.
 */
export class SchemaGapTimeLeaveCalendar1783041300000
  implements MigrationInterface
{
  name = 'SchemaGapTimeLeaveCalendar1783041300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "work_week_scope_type_enum" AS ENUM (
          'global', 'country', 'division', 'worker'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_week_patterns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "scopeType" "work_week_scope_type_enum" NOT NULL,
        "scopeId" uuid,
        "countryCode" character(2),
        "daysJson" jsonb NOT NULL,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_week_patterns" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_week_patterns_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_week_patterns_tenant_scope"
        ON "work_week_patterns" ("tenantId", "scopeType", "scopeId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_closures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "divisionId" uuid,
        "countryCode" character(2),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_closures" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_closures_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_company_closures_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_company_closures_tenant_dates"
        ON "company_closures" ("tenantId", "startDate", "endDate")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "staff_calendar_day_type_enum" AS ENUM (
          'working', 'holiday', 'leave', 'closure', 'non_working'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "staff_calendar_source_enum" AS ENUM (
          'auto_generated', 'manual_override'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_calendar_days" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "calendarDate" date NOT NULL,
        "dayType" "staff_calendar_day_type_enum" NOT NULL,
        "leaveRequestId" uuid,
        "source" "staff_calendar_source_enum" NOT NULL DEFAULT 'auto_generated',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_calendar_days" PRIMARY KEY ("id"),
        CONSTRAINT "FK_staff_calendar_days_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_staff_calendar_days_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_staff_calendar_days_leave_request" FOREIGN KEY ("leaveRequestId")
          REFERENCES "leave_requests"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_staff_calendar_days_unique"
        ON "staff_calendar_days" ("tenantId", "workerId", "calendarDate")
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_punches"
        ADD COLUMN IF NOT EXISTS "workMode" "work_mode_enum",
        ADD COLUMN IF NOT EXISTS "accuracyMeters" numeric(8,2),
        ADD COLUMN IF NOT EXISTS "officeMatch" boolean,
        ADD COLUMN IF NOT EXISTS "deviceInfo" character varying(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_day_summaries"
        ADD COLUMN IF NOT EXISTS "totalHours" numeric(5,2),
        ADD COLUMN IF NOT EXISTS "lopDays" numeric(3,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        ADD COLUMN IF NOT EXISTS "isHalfDay" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        DROP COLUMN IF EXISTS "isHalfDay"
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_day_summaries"
        DROP COLUMN IF EXISTS "lopDays",
        DROP COLUMN IF EXISTS "totalHours"
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_punches"
        DROP COLUMN IF EXISTS "deviceInfo",
        DROP COLUMN IF EXISTS "officeMatch",
        DROP COLUMN IF EXISTS "accuracyMeters",
        DROP COLUMN IF EXISTS "workMode"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_staff_calendar_days_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_calendar_days"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "staff_calendar_source_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "staff_calendar_day_type_enum"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_company_closures_tenant_dates"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "company_closures"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_week_patterns_tenant_scope"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "work_week_patterns"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "work_week_scope_type_enum"`,
    );
  }
}
