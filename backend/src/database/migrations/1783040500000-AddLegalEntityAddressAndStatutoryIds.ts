import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PRD database-design `legal_entities` address/contact/footer columns +
 * `legal_entity_statutory_ids` for jurisdiction registration numbers
 * (NTN/SECP, trade licence/VAT, UEN/GST) used on letterhead and merge fields.
 */
export class AddLegalEntityAddressAndStatutoryIds1783040500000
  implements MigrationInterface
{
  name = 'AddLegalEntityAddressAndStatutoryIds1783040500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "legal_entities"
        ADD COLUMN IF NOT EXISTS "addressLine1" character varying(255),
        ADD COLUMN IF NOT EXISTS "addressLine2" character varying(255),
        ADD COLUMN IF NOT EXISTS "city" character varying(100),
        ADD COLUMN IF NOT EXISTS "stateProvince" character varying(100),
        ADD COLUMN IF NOT EXISTS "postalCode" character varying(20),
        ADD COLUMN IF NOT EXISTS "phone" character varying(50),
        ADD COLUMN IF NOT EXISTS "email" character varying(255),
        ADD COLUMN IF NOT EXISTS "website" character varying(255),
        ADD COLUMN IF NOT EXISTS "footerText" text
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legal_entity_statutory_ids" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "fieldKey" character varying(50) NOT NULL,
        "fieldValue" character varying(255) NOT NULL,
        "expiryDate" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legal_entity_statutory_ids" PRIMARY KEY ("id"),
        CONSTRAINT "FK_legal_entity_statutory_ids_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_legal_entity_statutory_ids_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_legal_entity_statutory_ids_unique"
        ON "legal_entity_statutory_ids" ("tenantId", "legalEntityId", "fieldKey")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_legal_entity_statutory_ids_entity"
        ON "legal_entity_statutory_ids" ("tenantId", "legalEntityId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_legal_entity_statutory_ids_entity"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_legal_entity_statutory_ids_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "legal_entity_statutory_ids"`);
    await queryRunner.query(`
      ALTER TABLE "legal_entities"
        DROP COLUMN IF EXISTS "footerText",
        DROP COLUMN IF EXISTS "website",
        DROP COLUMN IF EXISTS "email",
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "postalCode",
        DROP COLUMN IF EXISTS "stateProvince",
        DROP COLUMN IF EXISTS "city",
        DROP COLUMN IF EXISTS "addressLine2",
        DROP COLUMN IF EXISTS "addressLine1"
    `);
  }
}
