import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompOffCredits1783038200000 implements MigrationInterface {
  name = 'CreateCompOffCredits1783038200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "comp_off_credit_status_enum" AS ENUM ('active', 'used', 'expired')
    `);

    await queryRunner.query(`
      CREATE TABLE "comp_off_credits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "creditedDays" decimal(5,2) NOT NULL,
        "earnedDate" date NOT NULL,
        "expiryDate" date,
        "sourceReference" varchar(255),
        "status" "comp_off_credit_status_enum" NOT NULL DEFAULT 'active',
        "grantedByWorkerId" uuid NOT NULL,
        "usedInLeaveRequestId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comp_off_credits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comp_off_credits_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_comp_off_credits_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comp_off_credits_granted_by" FOREIGN KEY ("grantedByWorkerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_comp_off_credits_leave_request" FOREIGN KEY ("usedInLeaveRequestId")
          REFERENCES "leave_requests"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_comp_off_credits_worker_status"
        ON "comp_off_credits" ("tenantId", "workerId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "comp_off_credits"`);
    await queryRunner.query(`DROP TYPE "comp_off_credit_status_enum"`);
  }
}
