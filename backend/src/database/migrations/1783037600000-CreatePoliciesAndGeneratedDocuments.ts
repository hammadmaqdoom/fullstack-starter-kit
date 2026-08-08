import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePoliciesAndGeneratedDocuments1783037600000
  implements MigrationInterface
{
  name = 'CreatePoliciesAndGeneratedDocuments1783037600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "policy_category_enum" AS ENUM ('hr', 'security', 'conduct', 'it')
    `);
    await queryRunner.query(`
      CREATE TYPE "policy_version_status_enum" AS ENUM ('draft', 'published', 'archived')
    `);
    await queryRunner.query(`
      CREATE TYPE "generated_document_status_enum" AS ENUM (
        'draft', 'issued', 'sent_for_signature', 'signed', 'archived'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "code" varchar(50) NOT NULL,
        "title" varchar(255) NOT NULL,
        "category" "policy_category_enum" NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_policies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policies_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_policies_tenant_code"
        ON "policies" ("tenantId", "code")
    `);

    await queryRunner.query(`
      CREATE TABLE "policy_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "policyId" uuid NOT NULL,
        "version" int NOT NULL,
        "contentHtml" text,
        "blobUrl" varchar(500),
        "effectiveFrom" date NOT NULL,
        "status" "policy_version_status_enum" NOT NULL DEFAULT 'draft',
        "publishedAt" TIMESTAMPTZ,
        "publishedBy" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_policy_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policy_versions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_policy_versions_policy" FOREIGN KEY ("policyId")
          REFERENCES "policies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_policy_versions_tenant_policy_version"
        ON "policy_versions" ("tenantId", "policyId", "version")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_policy_versions_status"
        ON "policy_versions" ("tenantId", "policyId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "policy_population_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "policyId" uuid NOT NULL,
        "countryCode" char(2),
        "divisionId" uuid,
        "employmentTypeId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_policy_population_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policy_population_rules_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_policy_population_rules_policy" FOREIGN KEY ("policyId")
          REFERENCES "policies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_policy_population_rules_policy"
        ON "policy_population_rules" ("tenantId", "policyId")
    `);

    await queryRunner.query(`
      CREATE TABLE "policy_acknowledgements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "policyVersionId" uuid NOT NULL,
        "acknowledgedAt" TIMESTAMPTZ NOT NULL,
        "ipAddress" inet,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_policy_acknowledgements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policy_acknowledgements_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_policy_acknowledgements_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_policy_acknowledgements_version" FOREIGN KEY ("policyVersionId")
          REFERENCES "policy_versions"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_policy_acknowledgements_worker_version"
        ON "policy_acknowledgements" ("tenantId", "workerId", "policyVersionId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_policy_acknowledgements_version"
        ON "policy_acknowledgements" ("tenantId", "policyVersionId")
    `);

    await queryRunner.query(`
      CREATE TABLE "generated_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "templateVersionId" uuid NOT NULL,
        "status" "generated_document_status_enum" NOT NULL DEFAULT 'draft',
        "blobUrl" varchar(500),
        "mergeData" jsonb NOT NULL DEFAULT '{}',
        "templateSnapshot" jsonb,
        "legalEntityId" uuid,
        "issuedBy" uuid,
        "issuedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_generated_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_generated_documents_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_generated_documents_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_generated_documents_template_version" FOREIGN KEY ("templateVersionId")
          REFERENCES "document_template_versions"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_generated_documents_worker_status"
        ON "generated_documents" ("tenantId", "workerId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "generated_documents"`);
    await queryRunner.query(`DROP TABLE "policy_acknowledgements"`);
    await queryRunner.query(`DROP TABLE "policy_population_rules"`);
    await queryRunner.query(`DROP TABLE "policy_versions"`);
    await queryRunner.query(`DROP TABLE "policies"`);
    await queryRunner.query(`DROP TYPE "generated_document_status_enum"`);
    await queryRunner.query(`DROP TYPE "policy_version_status_enum"`);
    await queryRunner.query(`DROP TYPE "policy_category_enum"`);
  }
}
