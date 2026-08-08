import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreBoardingCandidateAccessToken1783038100000
  implements MigrationInterface
{
  name = 'AddPreBoardingCandidateAccessToken1783038100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pre_boarding_packets"
        ADD COLUMN "accessTokenHash" varchar(64),
        ADD COLUMN "accessTokenExpiresAt" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pre_boarding_packets_access_token_hash"
        ON "pre_boarding_packets" ("accessTokenHash")
        WHERE "accessTokenHash" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pre_boarding_packets_access_token_hash"`,
    );
    await queryRunner.query(`
      ALTER TABLE "pre_boarding_packets"
        DROP COLUMN "accessTokenHash",
        DROP COLUMN "accessTokenExpiresAt"
    `);
  }
}
