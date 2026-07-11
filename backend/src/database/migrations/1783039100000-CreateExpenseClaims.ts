import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpenseClaims1783039100000 implements MigrationInterface {
  name = 'CreateExpenseClaims1783039100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "expense_category_enum" AS ENUM (
        'travel', 'food', 'medical', 'accommodation', 'transport',
        'office_supplies', 'client_entertainment', 'other'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "expense_claim_status_enum" AS ENUM (
        'draft', 'submitted', 'approved', 'rejected', 'paid'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "expense_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "countryCode" character(2) NOT NULL,
        "category" "expense_category_enum" NOT NULL,
        "dailyCap" numeric(15,2),
        "monthlyCap" numeric(15,2),
        "receiptRequiredAbove" numeric(15,2),
        "currencyCode" character(3) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_policies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expense_policies_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_expense_policies_tenant_country_category"
        ON "expense_policies" ("tenantId", "countryCode", "category")
    `);

    await queryRunner.query(`
      CREATE TABLE "expense_claims" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "legalEntityId" uuid,
        "workerId" uuid NOT NULL,
        "travelRequestId" uuid,
        "category" "expense_category_enum" NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currencyCode" character(3) NOT NULL,
        "expenseDate" date NOT NULL,
        "description" text,
        "receiptBlobUrl" character varying(500),
        "ocrPrefill" jsonb,
        "status" "expense_claim_status_enum" NOT NULL DEFAULT 'draft',
        "submittedAt" TIMESTAMPTZ,
        "managerApprovedBy" uuid,
        "managerApprovedAt" TIMESTAMPTZ,
        "financeApprovedBy" uuid,
        "financeApprovedAt" TIMESTAMPTZ,
        "rejectionReason" text,
        "policyViolation" jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_claims" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expense_claims_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_expense_claims_legal_entity" FOREIGN KEY ("legalEntityId")
          REFERENCES "legal_entities"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_expense_claims_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expense_claims_tenant_worker_status"
        ON "expense_claims" ("tenantId", "workerId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expense_claims_travel_request"
        ON "expense_claims" ("tenantId", "travelRequestId")
    `);

    await queryRunner.query(`
      CREATE TABLE "expense_claim_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "expenseClaimId" uuid NOT NULL,
        "description" character varying(500) NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "expenseDate" date,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_claim_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expense_claim_lines_claim" FOREIGN KEY ("expenseClaimId")
          REFERENCES "expense_claims"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expense_claim_lines_tenant_claim"
        ON "expense_claim_lines" ("tenantId", "expenseClaimId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "expense_claim_lines"`);
    await queryRunner.query(`DROP TABLE "expense_claims"`);
    await queryRunner.query(`DROP TABLE "expense_policies"`);
    await queryRunner.query(`DROP TYPE "expense_claim_status_enum"`);
    await queryRunner.query(`DROP TYPE "expense_category_enum"`);
  }
}
