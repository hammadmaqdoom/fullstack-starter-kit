import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApprovalDelegations1783037500000 implements MigrationInterface {
  name = 'CreateApprovalDelegations1783037500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "delegation_scope_enum" AS ENUM ('approvals', 'all')
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_delegations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "delegatorWorkerId" uuid NOT NULL,
        "delegateWorkerId" uuid NOT NULL,
        "scope" "delegation_scope_enum" NOT NULL DEFAULT 'approvals',
        "effectiveFrom" TIMESTAMPTZ NOT NULL,
        "effectiveTo" TIMESTAMPTZ NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_delegations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approval_delegations_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_approval_delegations_delegator" FOREIGN KEY ("delegatorWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_approval_delegations_delegate" FOREIGN KEY ("delegateWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_approval_delegations_delegator"
        ON "approval_delegations" ("tenantId", "delegatorWorkerId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_approval_delegations_delegate"
        ON "approval_delegations" ("tenantId", "delegateWorkerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "approval_delegations"`);
    await queryRunner.query(`DROP TYPE "delegation_scope_enum"`);
  }
}
