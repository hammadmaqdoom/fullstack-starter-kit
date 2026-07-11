import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccessReviewTables1783040400000
  implements MigrationInterface
{
  name = 'CreateAccessReviewTables1783040400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "access_review_cycle_status_enum" AS ENUM ('open', 'completed')
    `);
    await queryRunner.query(`
      CREATE TYPE "access_review_item_status_enum" AS ENUM ('pending', 'certified', 'revoked')
    `);

    await queryRunner.query(`
      CREATE TABLE "access_review_cycles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "periodLabel" varchar(20) NOT NULL,
        "status" "access_review_cycle_status_enum" NOT NULL DEFAULT 'open',
        "dueDate" date,
        "createdByUserId" uuid NOT NULL,
        "openedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMPTZ,
        CONSTRAINT "PK_access_review_cycles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_access_review_cycles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "access_review_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "cycleId" uuid NOT NULL,
        "assignmentId" uuid,
        "userId" uuid NOT NULL,
        "userEmail" varchar(255) NOT NULL,
        "workerId" uuid,
        "managerWorkerId" uuid,
        "roleCode" varchar(50) NOT NULL,
        "scopeType" varchar(20) NOT NULL,
        "scopeLabel" varchar(100),
        "status" "access_review_item_status_enum" NOT NULL DEFAULT 'pending',
        "reviewedByUserId" uuid,
        "reviewedAt" TIMESTAMPTZ,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_access_review_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_access_review_items_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_access_review_items_cycle" FOREIGN KEY ("cycleId")
          REFERENCES "access_review_cycles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_access_review_items_cycle"
        ON "access_review_items" ("tenantId", "cycleId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_access_review_items_worker"
        ON "access_review_items" ("tenantId", "workerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "access_review_items"`);
    await queryRunner.query(`DROP TABLE "access_review_cycles"`);
    await queryRunner.query(`DROP TYPE "access_review_item_status_enum"`);
    await queryRunner.query(`DROP TYPE "access_review_cycle_status_enum"`);
  }
}
