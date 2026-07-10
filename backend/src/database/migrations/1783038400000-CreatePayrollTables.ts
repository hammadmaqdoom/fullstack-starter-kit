import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayrollTables1783038400000 implements MigrationInterface {
  name = 'CreatePayrollTables1783038400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "pay_component_type_enum" AS ENUM (
        'earning', 'deduction', 'employer_contribution'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "pay_frequency_enum" AS ENUM ('monthly', 'hourly', 'daily')
    `);
    await queryRunner.query(`
      CREATE TYPE "benefit_type_field_type_enum" AS ENUM (
        'text', 'number', 'date', 'select'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "employee_benefit_status_enum" AS ENUM (
        'active', 'suspended', 'terminated', 'draft'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "statutory_schedule_status_enum" AS ENUM (
        'draft', 'active', 'superseded'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "statutory_rate_unit_enum" AS ENUM ('percentage', 'fixed_amount')
    `);
    await queryRunner.query(`
      CREATE TYPE "benefit_type_status_enum" AS ENUM ('draft', 'active', 'archived')
    `);
    await queryRunner.query(`
      CREATE TYPE "benefit_payroll_treatment_enum" AS ENUM (
        'include_in_gross', 'exclude_from_gross', 'employer_cost_only', 'informational_only'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pay_components" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "componentType" "pay_component_type_enum" NOT NULL,
        "isStatutory" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pay_components" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pay_components_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_pay_components_tenant_code"
        ON "pay_components" ("tenantId", "code")
    `);

    await queryRunner.query(`
      CREATE TABLE "compensation_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "payComponentId" uuid NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currencyCode" character(3) NOT NULL,
        "payFrequency" "pay_frequency_enum" NOT NULL,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_compensation_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_compensation_records_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_compensation_records_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_compensation_records_pay_component" FOREIGN KEY ("payComponentId")
          REFERENCES "pay_components"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_compensation_records_tenant_worker"
        ON "compensation_records" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "benefit_type_fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "benefitTypeId" uuid NOT NULL,
        "fieldCode" character varying(50) NOT NULL,
        "label" character varying(100) NOT NULL,
        "fieldType" "benefit_type_field_type_enum" NOT NULL,
        "required" boolean NOT NULL DEFAULT false,
        "employeeVisible" boolean NOT NULL DEFAULT false,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "validationRules" jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_benefit_type_fields" PRIMARY KEY ("id"),
        CONSTRAINT "FK_benefit_type_fields_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_benefit_type_fields_benefit_type" FOREIGN KEY ("benefitTypeId")
          REFERENCES "benefit_types"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_benefit_type_fields_type_code"
        ON "benefit_type_fields" ("benefitTypeId", "fieldCode")
    `);

    await queryRunner.query(`
      CREATE TABLE "employee_benefits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "benefitTypeId" uuid NOT NULL,
        "fieldValues" jsonb NOT NULL DEFAULT '{}',
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "status" "employee_benefit_status_enum" NOT NULL DEFAULT 'draft',
        "currencyCode" character(3),
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_benefits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employee_benefits_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_employee_benefits_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_employee_benefits_benefit_type" FOREIGN KEY ("benefitTypeId")
          REFERENCES "benefit_types"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_benefits_tenant_worker"
        ON "employee_benefits" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "statutory_rate_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "name" character varying(100) NOT NULL,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "status" "statutory_schedule_status_enum" NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_statutory_rate_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_statutory_rate_schedules_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_statutory_rate_schedules_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_statutory_rate_schedules_scope"
        ON "statutory_rate_schedules" ("tenantId", "legalEntityId", "countryCode", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "statutory_rate_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "scheduleId" uuid NOT NULL,
        "rateKey" character varying(50) NOT NULL,
        "rateValue" numeric(10,6) NOT NULL,
        "rateUnit" "statutory_rate_unit_enum" NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_statutory_rate_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_statutory_rate_entries_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_statutory_rate_entries_schedule" FOREIGN KEY ("scheduleId")
          REFERENCES "statutory_rate_schedules"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_statutory_rate_entries_schedule"
        ON "statutory_rate_entries" ("tenantId", "scheduleId")
    `);

    await queryRunner.query(`
      ALTER TABLE "benefit_types"
        ADD "status" "benefit_type_status_enum" NOT NULL DEFAULT 'draft'
    `);
    await queryRunner.query(`
      ALTER TABLE "benefit_types"
        ADD "payrollTreatment" "benefit_payroll_treatment_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "benefit_types"
        ADD "payComponentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "benefit_types"
        ADD "employeeVisible" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "benefit_types"
        ADD CONSTRAINT "FK_benefit_types_pay_component" FOREIGN KEY ("payComponentId")
          REFERENCES "pay_components"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "benefit_types" DROP CONSTRAINT "FK_benefit_types_pay_component"`,
    );
    await queryRunner.query(
      `ALTER TABLE "benefit_types" DROP COLUMN "employeeVisible"`,
    );
    await queryRunner.query(
      `ALTER TABLE "benefit_types" DROP COLUMN "payComponentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "benefit_types" DROP COLUMN "payrollTreatment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "benefit_types" DROP COLUMN "status"`,
    );

    await queryRunner.query(`DROP TABLE "statutory_rate_entries"`);
    await queryRunner.query(`DROP TABLE "statutory_rate_schedules"`);
    await queryRunner.query(`DROP TABLE "employee_benefits"`);
    await queryRunner.query(`DROP TABLE "benefit_type_fields"`);
    await queryRunner.query(`DROP TABLE "compensation_records"`);
    await queryRunner.query(`DROP TABLE "pay_components"`);

    await queryRunner.query(`DROP TYPE "benefit_payroll_treatment_enum"`);
    await queryRunner.query(`DROP TYPE "benefit_type_status_enum"`);
    await queryRunner.query(`DROP TYPE "statutory_rate_unit_enum"`);
    await queryRunner.query(`DROP TYPE "statutory_schedule_status_enum"`);
    await queryRunner.query(`DROP TYPE "employee_benefit_status_enum"`);
    await queryRunner.query(`DROP TYPE "benefit_type_field_type_enum"`);
    await queryRunner.query(`DROP TYPE "pay_frequency_enum"`);
    await queryRunner.query(`DROP TYPE "pay_component_type_enum"`);
  }
}
