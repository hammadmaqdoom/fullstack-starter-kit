import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkers1783037100000 implements MigrationInterface {
  name = 'CreateWorkers1783037100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "work_mode_enum" AS ENUM ('remote', 'hybrid', 'in_office')
    `);
    await queryRunner.query(`
      CREATE TYPE "worker_status_enum" AS ENUM (
        'draft', 'active', 'on_leave', 'separated', 'archived'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "entra_status_enum" AS ENUM (
        'not_required', 'pending', 'provisioned', 'disabled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "billing_model_enum" AS ENUM (
        'day_rate', 'hourly', 'fixed_fee', 'retainer'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "workers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid,
        "userId" uuid,
        "employmentTypeId" uuid NOT NULL,
        "divisionId" uuid,
        "departmentId" uuid,
        "managerId" uuid,
        "countryCode" character(2) NOT NULL,
        "bankCountryCode" character(2) NOT NULL,
        "personalEmail" character varying(255),
        "workMode" "work_mode_enum",
        "status" "worker_status_enum" NOT NULL DEFAULT 'draft',
        "employeeNumber" character varying(50),
        "firstName" character varying(100) NOT NULL,
        "lastName" character varying(100) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(50),
        "entraStatus" "entra_status_enum" NOT NULL DEFAULT 'not_required',
        "entraObjectId" character varying(255),
        "probationEndDate" date,
        "startDate" date NOT NULL,
        "endDate" date,
        "fteFraction" numeric(3,2) NOT NULL DEFAULT 1.00,
        "timezone" character varying(50),
        "statutoryFields" jsonb NOT NULL DEFAULT '{}',
        "compensationBand" jsonb,
        "deletedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workers_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_workers_employment_type" FOREIGN KEY ("employmentTypeId")
          REFERENCES "employment_types"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_workers_tenant_email"
        ON "workers" ("tenantId", "email")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_workers_tenant_employee_number"
        ON "workers" ("tenantId", "employeeNumber")
        WHERE "employeeNumber" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workers_status"
        ON "workers" ("tenantId", "status", "countryCode")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workers_entity"
        ON "workers" ("tenantId", "legalEntityId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workers_manager"
        ON "workers" ("tenantId", "managerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "contractor_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "billingModel" "billing_model_enum" NOT NULL,
        "contractStart" date,
        "contractEnd" date,
        "paymentTermsDays" integer,
        "paymentCurrency" character(3),
        "agencyName" character varying(255),
        CONSTRAINT "PK_contractor_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contractor_profiles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_contractor_profiles_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contractor_profiles_currency" FOREIGN KEY ("paymentCurrency")
          REFERENCES "currency_codes"("code") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_contractor_profiles_tenant_worker"
        ON "contractor_profiles" ("tenantId", "workerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contractor_profiles"`);
    await queryRunner.query(`DROP TABLE "workers"`);
    await queryRunner.query(`DROP TYPE "billing_model_enum"`);
    await queryRunner.query(`DROP TYPE "entra_status_enum"`);
    await queryRunner.query(`DROP TYPE "worker_status_enum"`);
    await queryRunner.query(`DROP TYPE "work_mode_enum"`);
  }
}
