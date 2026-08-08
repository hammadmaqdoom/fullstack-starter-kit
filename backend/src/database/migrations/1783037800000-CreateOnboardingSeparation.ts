import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOnboardingSeparation1783037800000
  implements MigrationInterface
{
  name = 'CreateOnboardingSeparation1783037800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "onboarding_template_status_enum" AS ENUM ('draft', 'published')
    `);
    await queryRunner.query(`
      CREATE TYPE "onboarding_assignee_role_enum" AS ENUM (
        'employee', 'manager', 'people_ops', 'it', 'finance'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "onboarding_case_status_enum" AS ENUM (
        'not_started', 'in_progress', 'blocked', 'complete'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "onboarding_task_status_enum" AS ENUM (
        'pending', 'done', 'skipped', 'blocked'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "separation_case_status_enum" AS ENUM (
        'initiated', 'in_progress', 'cleared', 'archived'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "clearance_category_enum" AS ENUM (
        'hr', 'it', 'finance', 'manager'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "clearance_item_status_enum" AS ENUM (
        'pending', 'cleared', 'waived'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "onboarding_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "countryCode" character varying(2),
        "employmentTypeId" uuid,
        "version" integer NOT NULL DEFAULT 1,
        "status" "onboarding_template_status_enum" NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_onboarding_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_onboarding_templates_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_onboarding_templates_employment_type" FOREIGN KEY ("employmentTypeId")
          REFERENCES "employment_types"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_onboarding_templates_tenant_status"
        ON "onboarding_templates" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "onboarding_template_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "templateId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "assigneeRole" "onboarding_assignee_role_enum" NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isRequired" boolean NOT NULL DEFAULT true,
        "dueOffsetDays" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_onboarding_template_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_onboarding_template_tasks_template" FOREIGN KEY ("templateId")
          REFERENCES "onboarding_templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_onboarding_template_tasks_template"
        ON "onboarding_template_tasks" ("templateId", "sortOrder")
    `);

    await queryRunner.query(`
      CREATE TABLE "onboarding_cases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "templateId" uuid NOT NULL,
        "status" "onboarding_case_status_enum" NOT NULL DEFAULT 'not_started',
        "startDate" date NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_onboarding_cases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_onboarding_cases_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_onboarding_cases_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_onboarding_cases_template" FOREIGN KEY ("templateId")
          REFERENCES "onboarding_templates"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_onboarding_cases_tenant_status"
        ON "onboarding_cases" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_onboarding_cases_worker"
        ON "onboarding_cases" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "onboarding_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "caseId" uuid NOT NULL,
        "templateTaskId" uuid,
        "status" "onboarding_task_status_enum" NOT NULL DEFAULT 'pending',
        "assigneeWorkerId" uuid,
        "completedAt" TIMESTAMPTZ,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_onboarding_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_onboarding_tasks_case" FOREIGN KEY ("caseId")
          REFERENCES "onboarding_cases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_onboarding_tasks_template_task" FOREIGN KEY ("templateTaskId")
          REFERENCES "onboarding_template_tasks"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_onboarding_tasks_assignee" FOREIGN KEY ("assigneeWorkerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_onboarding_tasks_case"
        ON "onboarding_tasks" ("caseId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "separation_cases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "lastWorkingDay" date NOT NULL,
        "status" "separation_case_status_enum" NOT NULL DEFAULT 'initiated',
        "reason" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_separation_cases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_separation_cases_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_separation_cases_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_separation_cases_tenant_status"
        ON "separation_cases" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_separation_cases_worker"
        ON "separation_cases" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "clearance_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "separationCaseId" uuid NOT NULL,
        "category" "clearance_category_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "status" "clearance_item_status_enum" NOT NULL DEFAULT 'pending',
        "clearedBy" uuid,
        "clearedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clearance_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_clearance_items_separation" FOREIGN KEY ("separationCaseId")
          REFERENCES "separation_cases"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_clearance_items_case"
        ON "clearance_items" ("separationCaseId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "clearance_items"`);
    await queryRunner.query(`DROP TABLE "separation_cases"`);
    await queryRunner.query(`DROP TABLE "onboarding_tasks"`);
    await queryRunner.query(`DROP TABLE "onboarding_cases"`);
    await queryRunner.query(`DROP TABLE "onboarding_template_tasks"`);
    await queryRunner.query(`DROP TABLE "onboarding_templates"`);
    await queryRunner.query(`DROP TYPE "clearance_item_status_enum"`);
    await queryRunner.query(`DROP TYPE "clearance_category_enum"`);
    await queryRunner.query(`DROP TYPE "separation_case_status_enum"`);
    await queryRunner.query(`DROP TYPE "onboarding_task_status_enum"`);
    await queryRunner.query(`DROP TYPE "onboarding_case_status_enum"`);
    await queryRunner.query(`DROP TYPE "onboarding_assignee_role_enum"`);
    await queryRunner.query(`DROP TYPE "onboarding_template_status_enum"`);
  }
}
