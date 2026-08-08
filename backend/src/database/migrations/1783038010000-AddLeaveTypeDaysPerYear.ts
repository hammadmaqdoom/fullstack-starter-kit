import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveTypeDaysPerYear1783038000000
  implements MigrationInterface
{
  name = 'AddLeaveTypeDaysPerYear1783038000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leave_types"
        ADD COLUMN "daysPerYear" numeric(5,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leave_types" DROP COLUMN "daysPerYear"
    `);
  }
}
