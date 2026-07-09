import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantAndAuditLog1783036800000 implements MigrationInterface {
  name = 'CreateTenantAndAuditLog1783036800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "baseReportingCurrency" character(3),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tenants_slug" ON "tenants" ("slug")
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "entityType" character varying(100) NOT NULL,
        "entityId" uuid NOT NULL,
        "action" character varying(50) NOT NULL,
        "actorId" uuid NOT NULL,
        "changes" jsonb NOT NULL DEFAULT '{}',
        "correlationId" uuid,
        "ipAddress" inet,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_log_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_tenant_entity"
        ON "audit_log" ("tenantId", "entityType", "entityId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_tenant_created"
        ON "audit_log" ("tenantId", "createdAt")
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "audit_log" IS
        'Append-only audit trail. REVOKE UPDATE, DELETE on this table in production.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
