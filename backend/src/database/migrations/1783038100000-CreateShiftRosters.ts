import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShiftRosters1783038100000 implements MigrationInterface {
  name = 'CreateShiftRosters1783038100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "shift_type_enum" AS ENUM (
        'morning', 'evening', 'night', 'on_call'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "shift_rosters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "divisionId" uuid,
        "effectiveFrom" date NOT NULL,
        "effectiveTo" date,
        "createdBy" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shift_rosters" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shift_rosters_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_shift_rosters_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_shift_rosters_tenant_division"
        ON "shift_rosters" ("tenantId", "divisionId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_shift_rosters_effective"
        ON "shift_rosters" ("tenantId", "effectiveFrom", "effectiveTo")
    `);

    await queryRunner.query(`
      CREATE TABLE "shift_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "shiftRosterId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "shiftDate" date NOT NULL,
        "shiftType" "shift_type_enum" NOT NULL DEFAULT 'morning',
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shift_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_shift_assignments_worker_date"
          UNIQUE ("tenantId", "workerId", "shiftDate"),
        CONSTRAINT "FK_shift_assignments_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_shift_assignments_roster" FOREIGN KEY ("shiftRosterId")
          REFERENCES "shift_rosters"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shift_assignments_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_shift_assignments_roster_date"
        ON "shift_assignments" ("tenantId", "shiftRosterId", "shiftDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "shift_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shift_rosters"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "shift_type_enum"`);
  }
}
