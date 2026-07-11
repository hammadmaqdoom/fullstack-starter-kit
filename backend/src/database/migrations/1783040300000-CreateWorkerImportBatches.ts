import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkerImportBatches1783040300000
  implements MigrationInterface
{
  name = 'CreateWorkerImportBatches1783040300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "worker_import_batch_status_enum" AS ENUM (
        'pending', 'processing', 'completed', 'completed_with_errors', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "worker_import_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "status" "worker_import_batch_status_enum" NOT NULL DEFAULT 'pending',
        "fileName" varchar(255),
        "rows" jsonb NOT NULL,
        "totalRows" int NOT NULL DEFAULT 0,
        "successCount" int NOT NULL DEFAULT 0,
        "failureCount" int NOT NULL DEFAULT 0,
        "rowResults" jsonb,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMPTZ,
        CONSTRAINT "PK_worker_import_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_import_batches_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_worker_import_batches_tenant_status"
        ON "worker_import_batches" ("tenantId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "worker_import_batches"`);
    await queryRunner.query(`DROP TYPE "worker_import_batch_status_enum"`);
  }
}
