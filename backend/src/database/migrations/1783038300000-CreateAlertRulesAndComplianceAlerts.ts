import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAlertRulesAndComplianceAlerts1783038300000
  implements MigrationInterface
{
  name = 'CreateAlertRulesAndComplianceAlerts1783038300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "alert_rule_channel_enum" AS ENUM ('email', 'teams', 'in_app')
    `);
    await queryRunner.query(`
      CREATE TYPE "compliance_alert_type_enum" AS ENUM (
        'visa_expiry', 'probation_end', 'birthday', 'work_anniversary'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "compliance_alert_severity_enum" AS ENUM ('info', 'warning', 'critical')
    `);
    await queryRunner.query(`
      CREATE TYPE "compliance_alert_status_enum" AS ENUM ('open', 'acknowledged', 'resolved')
    `);

    await queryRunner.query(`
      CREATE TABLE "alert_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "conditionJson" jsonb NOT NULL DEFAULT '{}',
        "channel" "alert_rule_channel_enum" NOT NULL DEFAULT 'in_app',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alert_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_alert_rules_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alert_rules_tenant_active"
        ON "alert_rules" ("tenantId", "isActive")
    `);

    await queryRunner.query(`
      CREATE TABLE "compliance_alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid,
        "alertType" "compliance_alert_type_enum" NOT NULL,
        "title" varchar(255) NOT NULL,
        "dueDate" date,
        "severity" "compliance_alert_severity_enum" NOT NULL DEFAULT 'info',
        "status" "compliance_alert_status_enum" NOT NULL DEFAULT 'open',
        "sourceRuleId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_compliance_alerts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_compliance_alerts_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_compliance_alerts_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_compliance_alerts_rule" FOREIGN KEY ("sourceRuleId")
          REFERENCES "alert_rules"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_alerts_tenant_status"
        ON "compliance_alerts" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_alerts_dedupe"
        ON "compliance_alerts" ("tenantId", "workerId", "alertType", "dueDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "compliance_alerts"`);
    await queryRunner.query(`DROP TABLE "alert_rules"`);
    await queryRunner.query(`DROP TYPE "compliance_alert_status_enum"`);
    await queryRunner.query(`DROP TYPE "compliance_alert_severity_enum"`);
    await queryRunner.query(`DROP TYPE "compliance_alert_type_enum"`);
    await queryRunner.query(`DROP TYPE "alert_rule_channel_enum"`);
  }
}
