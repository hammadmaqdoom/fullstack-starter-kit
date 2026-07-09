import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSetupWizardTables1783037300000 implements MigrationInterface {
  name = 'CreateSetupWizardTables1783037300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "leave_accrual_method_enum" AS ENUM ('annual', 'monthly')
    `);
    await queryRunner.query(`
      CREATE TYPE "benefit_delivery_mode_enum" AS ENUM ('cash', 'non_cash', 'insurance')
    `);
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM (
        'offer_letter', 'contract', 'nda', 'sow', 'other'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "document_audience_enum" AS ENUM ('employee', 'contractor', 'shared')
    `);
    await queryRunner.query(`
      CREATE TYPE "document_template_status_enum" AS ENUM ('draft', 'active', 'archived')
    `);

    await queryRunner.query(`
      CREATE TABLE "setup_wizard_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "currentStep" character varying(50) NOT NULL DEFAULT 'organisation',
        "completedSteps" jsonb NOT NULL DEFAULT '[]',
        "skippedSteps" jsonb NOT NULL DEFAULT '[]',
        "stepData" jsonb NOT NULL DEFAULT '{}',
        "isComplete" boolean NOT NULL DEFAULT false,
        "completedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_setup_wizard_progress" PRIMARY KEY ("id"),
        CONSTRAINT "FK_setup_wizard_progress_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_setup_wizard_progress_tenant"
        ON "setup_wizard_progress" ("tenantId")
    `);

    await queryRunner.query(`
      CREATE TABLE "leave_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "accrualMethod" "leave_accrual_method_enum" NOT NULL DEFAULT 'annual',
        "carryForwardCap" numeric(5,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leave_types" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leave_types_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_leave_types_tenant_country_code"
        ON "leave_types" ("tenantId", "countryCode", "code")
    `);

    await queryRunner.query(`
      CREATE TABLE "holiday_calendars" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "name" character varying(100) NOT NULL,
        "effectiveYear" integer NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_holiday_calendars" PRIMARY KEY ("id"),
        CONSTRAINT "FK_holiday_calendars_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_holiday_calendars_tenant_country"
        ON "holiday_calendars" ("tenantId", "countryCode", "effectiveYear")
    `);

    await queryRunner.query(`
      CREATE TABLE "holidays" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "holidayCalendarId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "holidayDate" date NOT NULL,
        "isCompanyClosure" boolean NOT NULL DEFAULT false,
        "isOptionalWorking" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_holidays" PRIMARY KEY ("id"),
        CONSTRAINT "FK_holidays_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_holidays_calendar" FOREIGN KEY ("holidayCalendarId")
          REFERENCES "holiday_calendars"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_holidays_calendar_date"
        ON "holidays" ("holidayCalendarId", "holidayDate")
    `);

    await queryRunner.query(`
      CREATE TABLE "benefit_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "category" character varying(50) NOT NULL,
        "countryCode" character(2),
        "deliveryMode" "benefit_delivery_mode_enum" NOT NULL DEFAULT 'non_cash',
        "affectsPayroll" boolean NOT NULL DEFAULT false,
        "affectsTax" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_benefit_types" PRIMARY KEY ("id"),
        CONSTRAINT "FK_benefit_types_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_benefit_types_tenant_code"
        ON "benefit_types" ("tenantId", "code")
    `);

    await queryRunner.query(`
      CREATE TABLE "document_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "documentType" "document_type_enum" NOT NULL,
        "audience" "document_audience_enum" NOT NULL DEFAULT 'employee',
        "countryCode" character(2),
        "employmentTypeId" uuid,
        "divisionId" uuid,
        "status" "document_template_status_enum" NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_templates_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_document_templates_tenant_code"
        ON "document_templates" ("tenantId", "code")
    `);

    await queryRunner.query(`
      CREATE TABLE "document_template_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "templateId" uuid NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "body" text NOT NULL,
        "mergeFieldSchema" jsonb NOT NULL DEFAULT '{}',
        "createdBy" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_template_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_template_versions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_document_template_versions_template" FOREIGN KEY ("templateId")
          REFERENCES "document_templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_document_template_versions_tenant_template_version"
        ON "document_template_versions" ("tenantId", "templateId", "version")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_template_versions"`);
    await queryRunner.query(`DROP TABLE "document_templates"`);
    await queryRunner.query(`DROP TABLE "benefit_types"`);
    await queryRunner.query(`DROP TABLE "holidays"`);
    await queryRunner.query(`DROP TABLE "holiday_calendars"`);
    await queryRunner.query(`DROP TABLE "leave_types"`);
    await queryRunner.query(`DROP TABLE "setup_wizard_progress"`);
    await queryRunner.query(`DROP TYPE "document_template_status_enum"`);
    await queryRunner.query(`DROP TYPE "document_audience_enum"`);
    await queryRunner.query(`DROP TYPE "document_type_enum"`);
    await queryRunner.query(`DROP TYPE "benefit_delivery_mode_enum"`);
    await queryRunner.query(`DROP TYPE "leave_accrual_method_enum"`);
  }
}
