import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpenseClaimCardTransaction1783041900000
  implements MigrationInterface
{
  name = 'ExpenseClaimCardTransaction1783041900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expense_claims"
        ADD COLUMN IF NOT EXISTS "cardTransactionId" uuid
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_expense_claims_card_transaction"
        ON "expense_claims" ("cardTransactionId")
        WHERE "cardTransactionId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_expense_claims_card_transaction"`,
    );
    await queryRunner.query(`
      ALTER TABLE "expense_claims"
        DROP COLUMN IF EXISTS "cardTransactionId"
    `);
  }
}
