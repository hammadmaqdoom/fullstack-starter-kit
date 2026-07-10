import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractorPaymentBatches1783038900000
  implements MigrationInterface
{
  name = 'CreateContractorPaymentBatches1783038900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "contractor_payment_batch_status_enum" AS ENUM (
        'draft', 'review', 'approved', 'exported', 'locked'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contractor_payment_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "status" "contractor_payment_batch_status_enum" NOT NULL DEFAULT 'draft',
        "totalAmount" numeric(15,2) NOT NULL DEFAULT 0,
        "currencyCode" character(3) NOT NULL,
        "approvedBy" uuid,
        "approvedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contractor_payment_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contractor_payment_batches_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_contractor_payment_batches_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contractor_payment_batches_tenant_entity_period"
        ON "contractor_payment_batches" ("tenantId", "legalEntityId", "periodStart", "periodEnd")
    `);

    await queryRunner.query(`
      CREATE TABLE "contractor_payment_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "batchId" uuid NOT NULL,
        "invoiceId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "withholdingTax" numeric(15,2),
        "paymentReference" character varying(100),
        "paymentValueDate" date,
        "swiftUetr" character varying(50),
        "paidAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contractor_payment_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contractor_payment_lines_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_contractor_payment_lines_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_contractor_payment_lines_batch" FOREIGN KEY ("batchId")
          REFERENCES "contractor_payment_batches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contractor_payment_lines_invoice" FOREIGN KEY ("invoiceId")
          REFERENCES "contractor_invoices"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_contractor_payment_lines_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contractor_payment_lines_tenant_batch"
        ON "contractor_payment_lines" ("tenantId", "batchId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contractor_payment_lines_tenant_invoice"
        ON "contractor_payment_lines" ("tenantId", "invoiceId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contractor_payment_lines"`);
    await queryRunner.query(`DROP TABLE "contractor_payment_batches"`);
    await queryRunner.query(`DROP TYPE "contractor_payment_batch_status_enum"`);
  }
}
