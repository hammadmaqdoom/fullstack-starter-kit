import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractorInvoices1783038800000
  implements MigrationInterface
{
  name = 'CreateContractorInvoices1783038800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "contractor_invoice_status_enum" AS ENUM (
        'draft', 'submitted', 'manager_approved', 'finance_approved',
        'queued', 'paid', 'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contractor_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "invoiceNumber" character varying(50) NOT NULL,
        "invoiceDate" date NOT NULL,
        "dueDate" date NOT NULL,
        "servicePeriodFrom" date,
        "servicePeriodTo" date,
        "currencyCode" character(3) NOT NULL,
        "grossAmount" numeric(15,2) NOT NULL,
        "taxAmount" numeric(15,2),
        "status" "contractor_invoice_status_enum" NOT NULL DEFAULT 'draft',
        "pdfBlobUrl" character varying(500),
        "rejectionReason" text,
        "managerApprovedBy" uuid,
        "managerApprovedAt" TIMESTAMPTZ,
        "financeApprovedBy" uuid,
        "financeApprovedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contractor_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contractor_invoices_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_contractor_invoices_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_contractor_invoices_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_contractor_invoices_tenant_invoice_number"
        ON "contractor_invoices" ("tenantId", "invoiceNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contractor_invoices_tenant_worker_status"
        ON "contractor_invoices" ("tenantId", "workerId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "contractor_invoice_line_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "invoiceId" uuid NOT NULL,
        "description" text NOT NULL,
        "quantity" numeric(10,2) NOT NULL,
        "unitPrice" numeric(15,2) NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contractor_invoice_line_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contractor_invoice_line_items_invoice" FOREIGN KEY ("invoiceId")
          REFERENCES "contractor_invoices"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contractor_invoice_line_items_invoice"
        ON "contractor_invoice_line_items" ("tenantId", "invoiceId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contractor_invoice_line_items"`);
    await queryRunner.query(`DROP TABLE "contractor_invoices"`);
    await queryRunner.query(`DROP TYPE "contractor_invoice_status_enum"`);
  }
}
