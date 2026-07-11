import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecruitmentTrainingManpower1783039400000
  implements MigrationInterface
{
  name = 'CreateRecruitmentTrainingManpower1783039400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "requisition_status_enum" AS ENUM (
        'draft', 'pending_division_head', 'pending_people_ops', 'open', 'on_hold', 'closed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "candidate_status_enum" AS ENUM (
        'applied', 'screening', 'interview', 'offer', 'hired', 'rejected'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "scorecard_recommendation_enum" AS ENUM (
        'strong_hire', 'hire', 'no_hire', 'strong_no_hire'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "training_course_type_enum" AS ENUM ('mandatory', 'optional')
    `);
    await queryRunner.query(`
      CREATE TYPE "training_assignment_status_enum" AS ENUM (
        'assigned', 'in_progress', 'completed', 'overdue'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "training_assignment_source_enum" AS ENUM (
        'manual', 'onboarding_bundle', 'population'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "training_verification_method_enum" AS ENUM (
        'self_attest', 'manager_verified', 'hr_verified'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "manpower_plan_status_enum" AS ENUM ('draft', 'active', 'closed')
    `);
    await queryRunner.query(`
      CREATE TYPE "manpower_position_status_enum" AS ENUM ('open', 'filled', 'frozen')
    `);

    await queryRunner.query(`
      CREATE TABLE "job_requisitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "divisionId" uuid,
        "departmentId" uuid,
        "employmentTypeId" uuid NOT NULL,
        "countryCode" char(2) NOT NULL,
        "manpowerPositionId" uuid,
        "hiringManagerWorkerId" uuid NOT NULL,
        "headcount" integer NOT NULL DEFAULT 1,
        "filledCount" integer NOT NULL DEFAULT 0,
        "budgetBandMin" character varying(20),
        "budgetBandMax" character varying(20),
        "justification" text,
        "status" "requisition_status_enum" NOT NULL DEFAULT 'draft',
        "requestedByUserId" uuid NOT NULL,
        "approvedAt" TIMESTAMPTZ,
        "openedAt" TIMESTAMPTZ,
        "closedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_requisitions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_requisitions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_job_requisitions_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_job_requisitions_department" FOREIGN KEY ("departmentId")
          REFERENCES "departments"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_job_requisitions_employment_type" FOREIGN KEY ("employmentTypeId")
          REFERENCES "employment_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_job_requisitions_hiring_manager" FOREIGN KEY ("hiringManagerWorkerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_job_requisitions_tenant_status"
        ON "job_requisitions" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_job_requisitions_tenant_division"
        ON "job_requisitions" ("tenantId", "divisionId")
    `);

    await queryRunner.query(`
      CREATE TABLE "candidates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "requisitionId" uuid NOT NULL,
        "firstName" character varying(100) NOT NULL,
        "lastName" character varying(100) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(50),
        "source" character varying(100),
        "cvBlobUrl" character varying(500),
        "status" "candidate_status_enum" NOT NULL DEFAULT 'applied',
        "notes" text,
        "rejectedReason" text,
        "consentAt" TIMESTAMPTZ,
        "consentIp" inet,
        "hiredWorkerId" uuid,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_candidates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_candidates_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_candidates_requisition" FOREIGN KEY ("requisitionId")
          REFERENCES "job_requisitions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_candidates_hired_worker" FOREIGN KEY ("hiredWorkerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_candidates_tenant_requisition"
        ON "candidates" ("tenantId", "requisitionId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_candidates_tenant_status"
        ON "candidates" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_candidates_tenant_email"
        ON "candidates" ("tenantId", "email")
    `);

    await queryRunner.query(`
      CREATE TABLE "interview_scorecards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "candidateId" uuid NOT NULL,
        "stage" character varying(50) NOT NULL,
        "interviewerWorkerId" uuid NOT NULL,
        "criteria" jsonb NOT NULL DEFAULT '[]',
        "overallScore" numeric(5,2),
        "recommendation" "scorecard_recommendation_enum",
        "notes" text,
        "interviewedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interview_scorecards" PRIMARY KEY ("id"),
        CONSTRAINT "FK_interview_scorecards_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_interview_scorecards_candidate" FOREIGN KEY ("candidateId")
          REFERENCES "candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_interview_scorecards_interviewer" FOREIGN KEY ("interviewerWorkerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_interview_scorecards_tenant_candidate"
        ON "interview_scorecards" ("tenantId", "candidateId")
    `);

    await queryRunner.query(`
      CREATE TABLE "training_courses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "courseType" "training_course_type_enum" NOT NULL DEFAULT 'optional',
        "durationMinutes" integer,
        "renewalPeriodMonths" integer,
        "externalUrl" character varying(500),
        "attachmentBlobUrl" character varying(500),
        "isActive" boolean NOT NULL DEFAULT true,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_courses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_training_courses_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_training_courses_tenant_active"
        ON "training_courses" ("tenantId", "isActive")
    `);

    await queryRunner.query(`
      CREATE TABLE "training_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "dueDate" date,
        "status" "training_assignment_status_enum" NOT NULL DEFAULT 'assigned',
        "source" "training_assignment_source_enum" NOT NULL DEFAULT 'manual',
        "assignedByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_training_assignments_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_training_assignments_course" FOREIGN KEY ("courseId")
          REFERENCES "training_courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_training_assignments_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_training_assignments_tenant_worker"
        ON "training_assignments" ("tenantId", "workerId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_training_assignments_tenant_course"
        ON "training_assignments" ("tenantId", "courseId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_training_assignments_tenant_status"
        ON "training_assignments" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "training_completions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "assignmentId" uuid NOT NULL,
        "completedAt" TIMESTAMPTZ NOT NULL,
        "verificationMethod" "training_verification_method_enum" NOT NULL DEFAULT 'self_attest',
        "verifiedByUserId" uuid,
        "certificateBlobUrl" character varying(500),
        "notes" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_completions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_training_completions_assignment" UNIQUE ("tenantId", "assignmentId"),
        CONSTRAINT "FK_training_completions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_training_completions_assignment" FOREIGN KEY ("assignmentId")
          REFERENCES "training_assignments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_training_completions_tenant_assignment"
        ON "training_completions" ("tenantId", "assignmentId")
    `);

    await queryRunner.query(`
      CREATE TABLE "manpower_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "divisionId" uuid,
        "countryCode" char(2),
        "planYear" integer NOT NULL,
        "budgetedFte" integer NOT NULL DEFAULT 0,
        "budgetedContractorCapacity" integer NOT NULL DEFAULT 0,
        "plannedAttritionPercent" numeric(5,2) NOT NULL DEFAULT 0,
        "status" "manpower_plan_status_enum" NOT NULL DEFAULT 'draft',
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_manpower_plans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_manpower_plans_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manpower_plans_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_manpower_plans_tenant_year"
        ON "manpower_plans" ("tenantId", "planYear")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_manpower_plans_tenant_division"
        ON "manpower_plans" ("tenantId", "divisionId")
    `);

    await queryRunner.query(`
      CREATE TABLE "manpower_positions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "planId" uuid NOT NULL,
        "roleTitle" character varying(255) NOT NULL,
        "departmentId" uuid,
        "employmentTypeId" uuid NOT NULL,
        "headcount" integer NOT NULL DEFAULT 1,
        "filledCount" integer NOT NULL DEFAULT 0,
        "status" "manpower_position_status_enum" NOT NULL DEFAULT 'open',
        "requisitionId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_manpower_positions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_manpower_positions_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manpower_positions_plan" FOREIGN KEY ("planId")
          REFERENCES "manpower_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_manpower_positions_department" FOREIGN KEY ("departmentId")
          REFERENCES "departments"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_manpower_positions_employment_type" FOREIGN KEY ("employmentTypeId")
          REFERENCES "employment_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manpower_positions_requisition" FOREIGN KEY ("requisitionId")
          REFERENCES "job_requisitions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_manpower_positions_tenant_plan"
        ON "manpower_positions" ("tenantId", "planId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_manpower_positions_tenant_status"
        ON "manpower_positions" ("tenantId", "status")
    `);

    await queryRunner.query(`
      ALTER TABLE "job_requisitions"
        ADD CONSTRAINT "FK_job_requisitions_manpower_position" FOREIGN KEY ("manpowerPositionId")
          REFERENCES "manpower_positions"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_requisitions" DROP CONSTRAINT IF EXISTS "FK_job_requisitions_manpower_position"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "manpower_positions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "manpower_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "training_completions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "training_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "training_courses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "interview_scorecards"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_requisitions"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "manpower_position_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "manpower_plan_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "training_verification_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "training_assignment_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "training_assignment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "training_course_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "scorecard_recommendation_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "candidate_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "requisition_status_enum"`);
  }
}
