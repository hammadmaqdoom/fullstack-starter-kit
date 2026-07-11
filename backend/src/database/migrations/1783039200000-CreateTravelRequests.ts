import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTravelRequests1783039200000 implements MigrationInterface {
  name = 'CreateTravelRequests1783039200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "travel_type_enum" AS ENUM ('domestic', 'international')
    `);
    await queryRunner.query(`
      CREATE TYPE "travel_request_status_enum" AS ENUM (
        'draft', 'submitted', 'approved', 'in_progress', 'completed',
        'reconciled', 'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "travel_approval_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "amountThreshold" numeric(15,2),
        "currencyCode" character(3),
        "requireFinance" boolean NOT NULL DEFAULT false,
        "requirePeopleOpsForInternational" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_travel_approval_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_travel_approval_rules_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_travel_approval_rules_tenant"
        ON "travel_approval_rules" ("tenantId")
    `);

    await queryRunner.query(`
      CREATE TABLE "travel_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "destinations" jsonb NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "purpose" text NOT NULL,
        "travelType" "travel_type_enum" NOT NULL,
        "estimatedCost" numeric(15,2) NOT NULL,
        "actualCost" numeric(15,2),
        "currencyCode" character(3) NOT NULL,
        "status" "travel_request_status_enum" NOT NULL DEFAULT 'draft',
        "managerApprovedBy" uuid,
        "managerApprovedAt" TIMESTAMPTZ,
        "financeApprovedBy" uuid,
        "financeApprovedAt" TIMESTAMPTZ,
        "peopleOpsApprovedBy" uuid,
        "peopleOpsApprovedAt" TIMESTAMPTZ,
        "rejectionReason" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_travel_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_travel_requests_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_travel_requests_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_travel_requests_tenant_worker_status"
        ON "travel_requests" ("tenantId", "workerId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "travel_itineraries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "travelRequestId" uuid NOT NULL,
        "legType" character varying(50) NOT NULL,
        "description" text NOT NULL,
        "departureAt" TIMESTAMPTZ,
        "arrivalAt" TIMESTAMPTZ,
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_travel_itineraries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_travel_itineraries_request" FOREIGN KEY ("travelRequestId")
          REFERENCES "travel_requests"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_travel_itineraries_tenant_request"
        ON "travel_itineraries" ("tenantId", "travelRequestId")
    `);

    // expense_claims.travelRequestId predates this migration (no cross-migration FK ordering) — backfill the FK now that travel_requests exists.
    await queryRunner.query(`
      ALTER TABLE "expense_claims"
        ADD CONSTRAINT "FK_expense_claims_travel_request" FOREIGN KEY ("travelRequestId")
          REFERENCES "travel_requests"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expense_claims" DROP CONSTRAINT "FK_expense_claims_travel_request"
    `);
    await queryRunner.query(`DROP TABLE "travel_itineraries"`);
    await queryRunner.query(`DROP TABLE "travel_requests"`);
    await queryRunner.query(`DROP TABLE "travel_approval_rules"`);
    await queryRunner.query(`DROP TYPE "travel_request_status_enum"`);
    await queryRunner.query(`DROP TYPE "travel_type_enum"`);
  }
}
