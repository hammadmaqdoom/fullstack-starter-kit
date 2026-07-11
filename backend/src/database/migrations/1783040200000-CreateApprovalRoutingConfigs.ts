import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApprovalRoutingConfigs1783040200000
  implements MigrationInterface
{
  name = 'CreateApprovalRoutingConfigs1783040200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "approval_workflow_type_enum" AS ENUM ('leave', 'expense', 'travel')
    `);
    await queryRunner.query(`
      CREATE TYPE "approval_mode_enum" AS ENUM ('serial', 'parallel')
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_routing_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workflowType" "approval_workflow_type_enum" NOT NULL,
        "countryCode" character varying(2),
        "legalEntityId" uuid,
        "amountThreshold" decimal(14,2),
        "approverMode" "approval_mode_enum" NOT NULL DEFAULT 'serial',
        "escalationAfterDays" int,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_routing_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approval_routing_configs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_approval_routing_configs_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_approval_routing_configs_lookup"
        ON "approval_routing_configs" ("tenantId", "workflowType", "countryCode", "legalEntityId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "approval_routing_configs"`);
    await queryRunner.query(`DROP TYPE "approval_mode_enum"`);
    await queryRunner.query(`DROP TYPE "approval_workflow_type_enum"`);
  }
}
