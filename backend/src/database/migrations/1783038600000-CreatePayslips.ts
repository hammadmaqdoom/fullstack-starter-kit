import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayslips1783038600000 implements MigrationInterface {
  name = 'CreatePayslips1783038600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payslip_status_enum" AS ENUM ('draft', 'released')
    `);

    await queryRunner.query(`
      CREATE TABLE "payslips" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "payRunLineItemId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "netPay" numeric(15,2) NOT NULL,
        "currencyCode" character(3) NOT NULL,
        "pdfBlobUrl" character varying(500),
        "releasedAt" TIMESTAMPTZ,
        "status" "payslip_status_enum" NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payslips" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payslips_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payslips_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payslips_pay_run_line_item" FOREIGN KEY ("payRunLineItemId")
          REFERENCES "pay_run_line_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payslips_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payslips_tenant_worker"
        ON "payslips" ("tenantId", "workerId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_payslips_pay_run_line_item"
        ON "payslips" ("tenantId", "payRunLineItemId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payslips"`);
    await queryRunner.query(`DROP TYPE "payslip_status_enum"`);
  }
}
