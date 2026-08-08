import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * People Ops template editor (rich-text + merge fields) needs a display name on
 * document_templates and a draft/published lifecycle on document_template_versions,
 * mirroring policy_versions.
 */
export class AddDocumentTemplateNameAndVersionStatus1783038100000
  implements MigrationInterface
{
  name = 'AddDocumentTemplateNameAndVersionStatus1783038100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "document_template_version_status_enum" AS ENUM ('draft', 'published', 'archived')
    `);

    await queryRunner.query(`
      ALTER TABLE "document_templates"
        ADD COLUMN "name" character varying(150)
    `);

    await queryRunner.query(`
      ALTER TABLE "document_template_versions"
        ADD COLUMN "status" "document_template_version_status_enum" NOT NULL DEFAULT 'draft'
    `);
    await queryRunner.query(`
      ALTER TABLE "document_template_versions"
        ADD COLUMN "publishedAt" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "document_template_versions"
        ADD COLUMN "publishedBy" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "document_template_versions"
        ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_document_template_versions_status"
        ON "document_template_versions" ("tenantId", "templateId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_document_template_versions_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_template_versions" DROP COLUMN "updatedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_template_versions" DROP COLUMN "publishedBy"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_template_versions" DROP COLUMN "publishedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_template_versions" DROP COLUMN "status"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_templates" DROP COLUMN "name"
    `);
    await queryRunner.query(`
      DROP TYPE "document_template_version_status_enum"
    `);
  }
}
