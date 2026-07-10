import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRemittancePacks1783039000000 implements MigrationInterface {
  name = 'CreateRemittancePacks1783039000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "remittance_corridor_applies_to_enum" AS ENUM (
        'all', 'employee_payroll', 'contractor_invoice'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "remittance_payment_source_type_enum" AS ENUM (
        'pay_run_line', 'contractor_payment_line'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "remittance_pack_status_enum" AS ENUM (
        'assembling', 'partial', 'complete', 'incomplete'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "remittance_document_type_enum" AS ENUM (
        'payslip_pdf', 'invoice_pdf', 'signed_employment_contract',
        'signed_sow', 'signed_contract', 'salary_confirmation_letter',
        'payment_advice', 'withholding_certificate', 'swift_copy',
        'bank_payment_proof', 'wire_confirmation', 'tax_remit_form',
        'other_supporting'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "remittance_document_source_enum" AS ENUM (
        'auto', 'finance_upload', 'contractor_upload', 'generated'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "remittance_document_status_enum" AS ENUM (
        'available', 'pending', 'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "remittance_corridor_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "payerCountryCode" character(2) NOT NULL,
        "beneficiaryBankCountryCode" character(2) NOT NULL,
        "legalEntityId" uuid,
        "appliesTo" "remittance_corridor_applies_to_enum" NOT NULL DEFAULT 'all',
        "requiredDocTypes" jsonb NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        "effectiveFrom" date NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_remittance_corridor_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_remittance_corridor_configs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_remittance_corridor_configs_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_remittance_corridor_configs_lookup"
        ON "remittance_corridor_configs" ("tenantId", "payerCountryCode", "beneficiaryBankCountryCode", "isActive")
    `);

    await queryRunner.query(`
      CREATE TABLE "remittance_packs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "paymentSourceType" "remittance_payment_source_type_enum" NOT NULL,
        "paymentSourceId" uuid NOT NULL,
        "invoiceId" uuid,
        "payRunId" uuid,
        "corridorConfigId" uuid NOT NULL,
        "status" "remittance_pack_status_enum" NOT NULL DEFAULT 'assembling',
        "paymentReference" character varying(100),
        "completedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_remittance_packs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_remittance_packs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_remittance_packs_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_remittance_packs_invoice" FOREIGN KEY ("invoiceId")
          REFERENCES "contractor_invoices"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_remittance_packs_pay_run" FOREIGN KEY ("payRunId")
          REFERENCES "pay_runs"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_remittance_packs_corridor_config" FOREIGN KEY ("corridorConfigId")
          REFERENCES "remittance_corridor_configs"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_remittance_packs_source"
        ON "remittance_packs" ("tenantId", "paymentSourceType", "paymentSourceId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_remittance_packs_worker"
        ON "remittance_packs" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "remittance_pack_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "packId" uuid NOT NULL,
        "documentType" "remittance_document_type_enum" NOT NULL,
        "source" "remittance_document_source_enum" NOT NULL DEFAULT 'auto',
        "blobUrl" character varying(500),
        "status" "remittance_document_status_enum" NOT NULL DEFAULT 'pending',
        "uploadedBy" uuid,
        "uploadedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_remittance_pack_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_remittance_pack_documents_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_remittance_pack_documents_pack" FOREIGN KEY ("packId")
          REFERENCES "remittance_packs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_remittance_pack_documents_pack"
        ON "remittance_pack_documents" ("tenantId", "packId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "remittance_pack_documents"`);
    await queryRunner.query(`DROP TABLE "remittance_packs"`);
    await queryRunner.query(`DROP TABLE "remittance_corridor_configs"`);
    await queryRunner.query(`DROP TYPE "remittance_document_status_enum"`);
    await queryRunner.query(`DROP TYPE "remittance_document_source_enum"`);
    await queryRunner.query(`DROP TYPE "remittance_document_type_enum"`);
    await queryRunner.query(`DROP TYPE "remittance_pack_status_enum"`);
    await queryRunner.query(`DROP TYPE "remittance_payment_source_type_enum"`);
    await queryRunner.query(`DROP TYPE "remittance_corridor_applies_to_enum"`);
  }
}
