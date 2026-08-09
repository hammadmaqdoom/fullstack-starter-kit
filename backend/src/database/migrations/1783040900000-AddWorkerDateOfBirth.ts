import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkerDateOfBirth1783040900000 implements MigrationInterface {
  name = 'AddWorkerDateOfBirth1783040900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD COLUMN IF NOT EXISTS "dateOfBirth" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workers"
        DROP COLUMN IF EXISTS "dateOfBirth"
    `);
  }
}
