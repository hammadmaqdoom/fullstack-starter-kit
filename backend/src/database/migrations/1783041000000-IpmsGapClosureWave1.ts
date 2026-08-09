import { MigrationInterface, QueryRunner } from 'typeorm';

export class IpmsGapClosureWave11783041000000 implements MigrationInterface {
  name = 'IpmsGapClosureWave11783041000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."performance_reviews_outcomeletterstatus_enum" AS ENUM (
        'not_required',
        'pending_template',
        'drafted'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "performance_reviews"
        ADD COLUMN "outcomeLetterStatus" "public"."performance_reviews_outcomeletterstatus_enum"
          NOT NULL DEFAULT 'not_required',
        ADD COLUMN "outcomeLetterDocumentId" uuid NULL,
        ADD COLUMN "disputeReason" text NULL,
        ADD COLUMN "disputedAt" TIMESTAMPTZ NULL,
        ADD COLUMN "disputedByUserId" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "performance_reviews"
        DROP COLUMN "disputedByUserId",
        DROP COLUMN "disputedAt",
        DROP COLUMN "disputeReason",
        DROP COLUMN "outcomeLetterDocumentId",
        DROP COLUMN "outcomeLetterStatus"
    `);
    await queryRunner.query(
      `DROP TYPE "public"."performance_reviews_outcomeletterstatus_enum"`,
    );
  }
}
