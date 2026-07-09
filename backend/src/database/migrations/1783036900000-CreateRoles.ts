import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoles1783036900000 implements MigrationInterface {
  name = 'CreateRoles1783036900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role_assignments_scopetype_enum" AS ENUM (
        'own', 'team', 'division', 'all'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "isSystem" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_roles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_roles_tenant_code" ON "roles" ("tenantId", "code")
    `);

    await queryRunner.query(`
      CREATE TABLE "user_role_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        "scopeType" "user_role_assignments_scopetype_enum" NOT NULL DEFAULT 'own',
        "scopeId" uuid,
        "effectiveFrom" date,
        "effectiveTo" date,
        "assignedBy" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_role_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_role_assignments_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_user_role_assignments_user" FOREIGN KEY ("userId")
          REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_role_assignments_role" FOREIGN KEY ("roleId")
          REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_tenant_user_effective"
        ON "user_role_assignments" ("tenantId", "userId", "effectiveFrom")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_role_assignments"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TYPE "user_role_assignments_scopetype_enum"`);
  }
}
