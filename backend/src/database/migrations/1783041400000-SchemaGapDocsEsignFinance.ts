import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema gap wave 4: missing e-sign, document template, policy version,
 * and finance export profile columns.
 */
export class SchemaGapDocsEsignFinance1783041400000
  implements MigrationInterface
{
  name = 'SchemaGapDocsEsignFinance1783041400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "esign_envelopes"
        ADD COLUMN IF NOT EXISTS "legalEntityId" uuid,
        ADD COLUMN IF NOT EXISTS "generatedDocumentId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "esign_fields"
        ADD COLUMN IF NOT EXISTS "value" text
    `);

    await queryRunner.query(`
      ALTER TABLE "esign_audit_events"
        ADD COLUMN IF NOT EXISTS "ipAddress" character varying(64),
        ADD COLUMN IF NOT EXISTS "userAgent" text
    `);

    await queryRunner.query(`
      ALTER TABLE "document_templates"
        ADD COLUMN IF NOT EXISTS "requiresSignature" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "policy_versions"
        ADD COLUMN IF NOT EXISTS "requiresReacknowledgement" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_export_profiles"
        ADD COLUMN IF NOT EXISTS "exportType" character varying(50) NOT NULL DEFAULT 'pay_run',
        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "finance_export_profiles"
        DROP COLUMN IF EXISTS "version",
        DROP COLUMN IF EXISTS "exportType"
    `);

    await queryRunner.query(`
      ALTER TABLE "policy_versions"
        DROP COLUMN IF EXISTS "requiresReacknowledgement"
    `);

    await queryRunner.query(`
      ALTER TABLE "document_templates"
        DROP COLUMN IF EXISTS "requiresSignature"
    `);

    await queryRunner.query(`
      ALTER TABLE "esign_audit_events"
        DROP COLUMN IF EXISTS "userAgent",
        DROP COLUMN IF EXISTS "ipAddress"
    `);

    await queryRunner.query(`
      ALTER TABLE "esign_fields"
        DROP COLUMN IF EXISTS "value"
    `);

    await queryRunner.query(`
      ALTER TABLE "esign_envelopes"
        DROP COLUMN IF EXISTS "generatedDocumentId",
        DROP COLUMN IF EXISTS "legalEntityId"
    `);
  }
}
