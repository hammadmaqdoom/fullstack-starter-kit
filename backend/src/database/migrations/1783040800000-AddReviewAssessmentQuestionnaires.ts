import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewAssessmentQuestionnaires1783040800000
  implements MigrationInterface
{
  name = 'AddReviewAssessmentQuestionnaires1783040800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "performance_cycles"
        ADD COLUMN IF NOT EXISTS "selfAssessmentTemplate" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "managerAssessmentTemplate" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "performance_reviews"
        ADD COLUMN IF NOT EXISTS "selfAssessmentPayload" jsonb,
        ADD COLUMN IF NOT EXISTS "managerAssessmentPayload" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "performance_reviews"
        DROP COLUMN IF EXISTS "managerAssessmentPayload",
        DROP COLUMN IF EXISTS "selfAssessmentPayload"
    `);
    await queryRunner.query(`
      ALTER TABLE "performance_cycles"
        DROP COLUMN IF EXISTS "managerAssessmentTemplate",
        DROP COLUMN IF EXISTS "selfAssessmentTemplate"
    `);
  }
}
