import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgStructure1783037200000 implements MigrationInterface {
  name = 'CreateOrgStructure1783037200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "entity_status_enum" AS ENUM ('active', 'inactive')
    `);
    await queryRunner.query(`
      CREATE TYPE "approval_status_enum" AS ENUM ('submitted', 'approved', 'rejected')
    `);
    await queryRunner.query(`
      CREATE TYPE "relationship_type_enum" AS ENUM ('direct', 'dotted_line')
    `);

    await queryRunner.query(`
      CREATE TABLE "divisions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "headWorkerId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_divisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_divisions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "divisionId" uuid,
        "name" character varying(100) NOT NULL,
        "parentDepartmentId" uuid,
        CONSTRAINT "PK_departments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_departments_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_departments_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_departments_parent" FOREIGN KEY ("parentDepartmentId")
          REFERENCES "departments"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "legal_entities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "registeredName" character varying(255) NOT NULL,
        "tradingName" character varying(255),
        "countryCode" character(2) NOT NULL,
        "functionalCurrency" character(3) NOT NULL,
        "status" "entity_status_enum" NOT NULL DEFAULT 'active',
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "createdBy" uuid,
        CONSTRAINT "PK_legal_entities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_legal_entities_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_legal_entities_currency" FOREIGN KEY ("functionalCurrency")
          REFERENCES "currency_codes"("code") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_legal_entities_tenant_code"
        ON "legal_entities" ("tenantId", "code")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_legal_entities_scope"
        ON "legal_entities" ("tenantId", "countryCode", "status")
    `);

    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD CONSTRAINT "FK_workers_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD CONSTRAINT "FK_workers_department" FOREIGN KEY ("departmentId")
          REFERENCES "departments"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD CONSTRAINT "FK_workers_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD CONSTRAINT "FK_workers_manager" FOREIGN KEY ("managerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "divisions"
        ADD CONSTRAINT "FK_divisions_head_worker" FOREIGN KEY ("headWorkerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "manager_relationships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "managerId" uuid NOT NULL,
        "relationshipType" "relationship_type_enum" NOT NULL DEFAULT 'direct',
        "effectiveFrom" date,
        "effectiveTo" date,
        CONSTRAINT "PK_manager_relationships" PRIMARY KEY ("id"),
        CONSTRAINT "FK_manager_relationships_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manager_relationships_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_manager_relationships_manager" FOREIGN KEY ("managerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "profile_change_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "fieldChanges" jsonb NOT NULL,
        "status" "approval_status_enum" NOT NULL DEFAULT 'submitted',
        "approverId" uuid,
        "reason" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profile_change_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_profile_change_requests_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_profile_change_requests_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_profile_change_requests_approver" FOREIGN KEY ("approverId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "profile_change_requests"`);
    await queryRunner.query(`DROP TABLE "manager_relationships"`);
    await queryRunner.query(
      `ALTER TABLE "divisions" DROP CONSTRAINT "FK_divisions_head_worker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workers" DROP CONSTRAINT "FK_workers_manager"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workers" DROP CONSTRAINT "FK_workers_legal_entity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workers" DROP CONSTRAINT "FK_workers_department"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workers" DROP CONSTRAINT "FK_workers_division"`,
    );
    await queryRunner.query(`DROP TABLE "legal_entities"`);
    await queryRunner.query(`DROP TABLE "departments"`);
    await queryRunner.query(`DROP TABLE "divisions"`);
    await queryRunner.query(`DROP TYPE "relationship_type_enum"`);
    await queryRunner.query(`DROP TYPE "approval_status_enum"`);
    await queryRunner.query(`DROP TYPE "entity_status_enum"`);
  }
}
