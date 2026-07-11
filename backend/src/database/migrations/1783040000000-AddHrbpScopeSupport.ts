import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHrbpScopeSupport1783040000000 implements MigrationInterface {
  name = 'AddHrbpScopeSupport1783040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "user_role_assignments_scopetype_enum" ADD VALUE IF NOT EXISTS 'legal_entity'`,
    );
    await queryRunner.query(
      `ALTER TYPE "user_role_assignments_scopetype_enum" ADD VALUE IF NOT EXISTS 'country'`,
    );

    await queryRunner.query(`
      ALTER TABLE "user_role_assignments"
      ADD COLUMN "scopeCountryCode" character varying(2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_role_assignments" DROP COLUMN "scopeCountryCode"
    `);
    // Postgres does not support removing enum values; scope type additions are left in place.
  }
}
