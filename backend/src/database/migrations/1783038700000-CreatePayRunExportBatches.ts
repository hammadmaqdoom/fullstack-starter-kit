import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayRunExportBatches1783038700000
  implements MigrationInterface
{
  name = 'CreatePayRunExportBatches1783038700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "export_file_format_enum" AS ENUM ('xlsx', 'csv', 'pdf')
    `);

    await queryRunner.query(`
      CREATE TABLE "finance_export_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid,
        "countryCode" character(2),
        "name" character varying(100) NOT NULL,
        "columnMappings" jsonb NOT NULL DEFAULT '[]',
        "fileFormats" jsonb NOT NULL DEFAULT '["xlsx", "pdf"]',
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_finance_export_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_finance_export_profiles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_finance_export_profiles_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_finance_export_profiles_tenant"
        ON "finance_export_profiles" ("tenantId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_finance_export_profiles_scope"
        ON "finance_export_profiles" ("tenantId", "legalEntityId", "countryCode")
    `);

    await queryRunner.query(`
      CREATE TABLE "pay_run_export_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "payRunId" uuid,
        "contractorPaymentBatchId" uuid,
        "exportProfileId" uuid NOT NULL,
        "fileFormat" "export_file_format_enum" NOT NULL,
        "blobUrl" character varying(500) NOT NULL,
        "exportedBy" uuid NOT NULL,
        "exportedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pay_run_export_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pay_run_export_batches_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pay_run_export_batches_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pay_run_export_batches_pay_run" FOREIGN KEY ("payRunId")
          REFERENCES "pay_runs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pay_run_export_batches_export_profile" FOREIGN KEY ("exportProfileId")
          REFERENCES "finance_export_profiles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pay_run_export_batches_pay_run"
        ON "pay_run_export_batches" ("tenantId", "payRunId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pay_run_export_batches_contractor_batch"
        ON "pay_run_export_batches" ("tenantId", "contractorPaymentBatchId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pay_run_export_batches"`);
    await queryRunner.query(`DROP TABLE "finance_export_profiles"`);
    await queryRunner.query(`DROP TYPE "export_file_format_enum"`);
  }
}
