import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectAssignments1783038200000
  implements MigrationInterface
{
  name = 'CreateProjectAssignments1783038200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "projectName" character varying(255) NOT NULL,
        "projectCode" character varying(50),
        "projectLeadId" uuid,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_assignments_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_project_assignments_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_assignments_lead" FOREIGN KEY ("projectLeadId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_project_assignments_tenant_worker"
        ON "project_assignments" ("tenantId", "workerId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_project_assignments_effective"
        ON "project_assignments" ("tenantId", "effectiveFrom", "effectiveTo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_assignments"`);
  }
}
