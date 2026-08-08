import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Draft → Issue workflow support (PRD §6.8.4): immutable `document_number`,
 * letterhead-version snapshot on issue, and a per-(entity, doc type, year)
 * sequence counter table for atomic numbering.
 */
export class AddDocumentIssuingColumns1783038300000
  implements MigrationInterface
{
  name = 'AddDocumentIssuingColumns1783038300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "generated_documents"
        ADD COLUMN "documentNumber" varchar(50),
        ADD COLUMN "letterheadConfigId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "generated_documents"
        ADD CONSTRAINT "FK_generated_documents_letterhead_config" FOREIGN KEY ("letterheadConfigId")
          REFERENCES "letterhead_configs"("id") ON DELETE RESTRICT
    `);
    // Partial unique index: draft rows have NULL document_number (multiple NULLs allowed);
    // once issued, the number is unique per tenant and never reassigned.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_generated_documents_document_number"
        ON "generated_documents" ("tenantId", "documentNumber")
        WHERE "documentNumber" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "document_number_sequences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "documentType" varchar(30) NOT NULL,
        "year" int NOT NULL,
        "lastSeq" int NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_number_sequences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_number_sequences_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_document_number_sequences_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_document_number_sequences_scope"
        ON "document_number_sequences" ("tenantId", "legalEntityId", "documentType", "year")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_number_sequences"`);
    await queryRunner.query(`
      ALTER TABLE "generated_documents"
        DROP CONSTRAINT "FK_generated_documents_letterhead_config"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_generated_documents_document_number"
    `);
    await queryRunner.query(`
      ALTER TABLE "generated_documents"
        DROP COLUMN "documentNumber",
        DROP COLUMN "letterheadConfigId"
    `);
  }
}
