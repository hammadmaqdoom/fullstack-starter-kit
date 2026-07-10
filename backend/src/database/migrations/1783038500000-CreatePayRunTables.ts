import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayRunTables1783038500000 implements MigrationInterface {
  name = 'CreatePayRunTables1783038500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "pay_run_status_enum" AS ENUM (
        'draft', 'review', 'approved', 'exported', 'locked'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pay_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "status" "pay_run_status_enum" NOT NULL DEFAULT 'draft',
        "functionalCurrency" character(3) NOT NULL,
        "financeExportProfileId" uuid,
        "approvedBy" uuid,
        "approvedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pay_runs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pay_runs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pay_runs_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pay_runs_tenant_entity_period"
        ON "pay_runs" ("tenantId", "legalEntityId", "periodStart", "periodEnd")
    `);

    await queryRunner.query(`
      CREATE TABLE "pay_run_line_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "payRunId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "grossPay" numeric(15,2) NOT NULL,
        "totalDeductions" numeric(15,2) NOT NULL,
        "netPay" numeric(15,2) NOT NULL,
        "currencyCode" character(3) NOT NULL,
        "calculationSnapshot" jsonb NOT NULL DEFAULT '{}',
        "anomalyFlags" jsonb NOT NULL DEFAULT '[]',
        "paymentReference" character varying(100),
        "paymentValueDate" date,
        "swiftUetr" character varying(50),
        "remittancePackId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pay_run_line_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pay_run_line_items_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pay_run_line_items_pay_run" FOREIGN KEY ("payRunId")
          REFERENCES "pay_runs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pay_run_line_items_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pay_run_line_items_pay_run"
        ON "pay_run_line_items" ("tenantId", "payRunId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pay_run_line_items_worker"
        ON "pay_run_line_items" ("tenantId", "workerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pay_run_line_items"`);
    await queryRunner.query(`DROP TABLE "pay_runs"`);
    await queryRunner.query(`DROP TYPE "pay_run_status_enum"`);
  }
}
