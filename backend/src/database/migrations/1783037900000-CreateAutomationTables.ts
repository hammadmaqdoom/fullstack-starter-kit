import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAutomationTables1783037900000 implements MigrationInterface {
  name = 'CreateAutomationTables1783037900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "report_type_enum" AS ENUM (
        'headcount', 'attrition', 'leave_liability', 'policy_compliance', 'visa_expiry'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "report_cadence_enum" AS ENUM ('daily', 'weekly', 'monthly')
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "emailApprovals" boolean NOT NULL DEFAULT true,
        "emailLeave" boolean NOT NULL DEFAULT true,
        "emailPolicies" boolean NOT NULL DEFAULT true,
        "pushEnabled" boolean NOT NULL DEFAULT false,
        "teamsAdaptiveCards" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_preferences_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_notification_preferences_user"
        ON "notification_preferences" ("tenantId", "userId")
    `);

    await queryRunner.query(`
      CREATE TABLE "scheduled_report_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "reportType" "report_type_enum" NOT NULL,
        "cadence" "report_cadence_enum" NOT NULL DEFAULT 'weekly',
        "filters" jsonb NOT NULL DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        "lastDeliveredAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_report_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_scheduled_reports_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_scheduled_reports_tenant_user"
        ON "scheduled_report_subscriptions" ("tenantId", "userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "scheduled_report_subscriptions"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP TYPE "report_cadence_enum"`);
    await queryRunner.query(`DROP TYPE "report_type_enum"`);
  }
}
