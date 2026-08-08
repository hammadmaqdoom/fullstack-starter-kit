import { MigrationInterface, QueryRunner } from 'typeorm';

/** Letterhead versioning + per-entity stamp/render config (PRD §6.8.1, database-design.md `letterhead_configs`). */
export class CreateLetterheadConfigs1783038200000
  implements MigrationInterface
{
  name = 'CreateLetterheadConfigs1783038200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "legal_entity_render_profile_enum" AS ENUM ('full_digital', 'print_on_letterhead')
    `);

    await queryRunner.query(`
      ALTER TABLE "legal_entities"
        ADD COLUMN "requiresWetStamp" boolean NOT NULL DEFAULT false,
        ADD COLUMN "stampInstructions" text,
        ADD COLUMN "defaultRenderProfile" "legal_entity_render_profile_enum" NOT NULL DEFAULT 'full_digital'
    `);

    await queryRunner.query(`
      CREATE TABLE "letterhead_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid NOT NULL,
        "version" int NOT NULL,
        "layoutJson" jsonb NOT NULL DEFAULT '{}',
        "logoBlobUrl" varchar(500),
        "previewBlobUrl" varchar(500),
        "isCurrent" boolean NOT NULL DEFAULT true,
        "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "effectiveTo" TIMESTAMPTZ,
        "createdBy" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_letterhead_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_letterhead_configs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_letterhead_configs_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_letterhead_configs_tenant_entity_version"
        ON "letterhead_configs" ("tenantId", "legalEntityId", "version")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_letterhead_configs_current"
        ON "letterhead_configs" ("tenantId", "legalEntityId", "isCurrent")
    `);
    // At most one current version per legal entity (enforced via partial unique index).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_letterhead_configs_one_current"
        ON "letterhead_configs" ("tenantId", "legalEntityId")
        WHERE "isCurrent" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "letterhead_configs"`);
    await queryRunner.query(`
      ALTER TABLE "legal_entities"
        DROP COLUMN "requiresWetStamp",
        DROP COLUMN "stampInstructions",
        DROP COLUMN "defaultRenderProfile"
    `);
    await queryRunner.query(`DROP TYPE "legal_entity_render_profile_enum"`);
  }
}
