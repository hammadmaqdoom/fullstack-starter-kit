import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTimeLeave1783037550000 implements MigrationInterface {
  name = 'CreateTimeLeave1783037550000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "punch_type_enum" AS ENUM ('check_in', 'check_out')
    `);
    await queryRunner.query(`
      CREATE TYPE "punch_source_enum" AS ENUM ('web', 'pwa', 'offline')
    `);
    await queryRunner.query(`
      CREATE TYPE "attendance_day_status_enum" AS ENUM (
        'in', 'out', 'on_leave', 'missing', 'incomplete'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "punch_correction_status_enum" AS ENUM (
        'submitted', 'approved', 'rejected'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "leave_request_status_enum" AS ENUM (
        'draft', 'submitted', 'approved', 'rejected', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "attendance_punches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "punchType" "punch_type_enum" NOT NULL,
        "punchedAt" TIMESTAMPTZ NOT NULL,
        "latitude" decimal(10,7),
        "longitude" decimal(10,7),
        "source" "punch_source_enum" NOT NULL DEFAULT 'web',
        "timezone" varchar(64) NOT NULL DEFAULT 'UTC',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_punches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attendance_punches_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attendance_punches_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_punches_worker_punched"
        ON "attendance_punches" ("tenantId", "workerId", "punchedAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "attendance_day_summaries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "workDate" date NOT NULL,
        "status" "attendance_day_status_enum" NOT NULL DEFAULT 'missing',
        "firstIn" TIMESTAMPTZ,
        "lastOut" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_day_summaries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attendance_day_summaries" UNIQUE ("tenantId", "workerId", "workDate"),
        CONSTRAINT "FK_attendance_day_summaries_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attendance_day_summaries_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_attendance_day_summaries_unique"
        ON "attendance_day_summaries" ("tenantId", "workerId", "workDate")
    `);

    await queryRunner.query(`
      CREATE TABLE "punch_correction_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "punchId" uuid,
        "requestedAt" TIMESTAMPTZ NOT NULL,
        "proposedType" "punch_type_enum" NOT NULL,
        "proposedTime" TIMESTAMPTZ NOT NULL,
        "reason" text NOT NULL,
        "status" "punch_correction_status_enum" NOT NULL DEFAULT 'submitted',
        "approverId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_punch_correction_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_punch_corrections_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_punch_corrections_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_punch_corrections_punch" FOREIGN KEY ("punchId")
          REFERENCES "attendance_punches"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_punch_corrections_worker_status"
        ON "punch_correction_requests" ("tenantId", "workerId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "leave_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "leaveTypeId" uuid NOT NULL,
        "year" int NOT NULL,
        "entitled" decimal(5,2) NOT NULL DEFAULT 0,
        "used" decimal(5,2) NOT NULL DEFAULT 0,
        "pending" decimal(5,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leave_balances" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_leave_balances" UNIQUE ("tenantId", "workerId", "leaveTypeId", "year"),
        CONSTRAINT "FK_leave_balances_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_leave_balances_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leave_balances_leave_type" FOREIGN KEY ("leaveTypeId")
          REFERENCES "leave_types"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_leave_balances_unique"
        ON "leave_balances" ("tenantId", "workerId", "leaveTypeId", "year")
    `);

    await queryRunner.query(`
      CREATE TABLE "leave_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "leaveTypeId" uuid NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "days" decimal(5,2) NOT NULL,
        "reason" text,
        "status" "leave_request_status_enum" NOT NULL DEFAULT 'submitted',
        "approverId" uuid,
        "managerId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leave_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leave_requests_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_leave_requests_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leave_requests_leave_type" FOREIGN KEY ("leaveTypeId")
          REFERENCES "leave_types"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_leave_requests_worker_status"
        ON "leave_requests" ("tenantId", "workerId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_leave_requests_approver_status"
        ON "leave_requests" ("tenantId", "approverId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "leave_requests"`);
    await queryRunner.query(`DROP TABLE "leave_balances"`);
    await queryRunner.query(`DROP TABLE "punch_correction_requests"`);
    await queryRunner.query(`DROP TABLE "attendance_day_summaries"`);
    await queryRunner.query(`DROP TABLE "attendance_punches"`);
    await queryRunner.query(`DROP TYPE "leave_request_status_enum"`);
    await queryRunner.query(`DROP TYPE "punch_correction_status_enum"`);
    await queryRunner.query(`DROP TYPE "attendance_day_status_enum"`);
    await queryRunner.query(`DROP TYPE "punch_source_enum"`);
    await queryRunner.query(`DROP TYPE "punch_type_enum"`);
  }
}
