import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePerformanceManagement1783037400000 implements MigrationInterface {
  name = 'CreatePerformanceManagement1783037400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "objective_level_enum" AS ENUM ('company', 'division', 'department')
    `);
    await queryRunner.query(`
      CREATE TYPE "objective_status_enum" AS ENUM ('draft', 'active', 'closed')
    `);
    await queryRunner.query(`
      CREATE TYPE "key_result_status_enum" AS ENUM (
        'not_started', 'in_progress', 'completed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "goal_type_enum" AS ENUM ('individual', 'team', 'project')
    `);
    await queryRunner.query(`
      CREATE TYPE "goal_status_enum" AS ENUM ('draft', 'active', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "goal_progress_status_enum" AS ENUM ('on_track', 'at_risk', 'off_track')
    `);
    await queryRunner.query(`
      CREATE TYPE "feedback_type_enum" AS ENUM ('praise', 'constructive', 'coaching')
    `);
    await queryRunner.query(`
      CREATE TYPE "one_on_one_status_enum" AS ENUM ('scheduled', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "performance_cycle_type_enum" AS ENUM (
        'annual', 'semi_annual', 'quarterly', 'probation'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "performance_cycle_status_enum" AS ENUM (
        'draft', 'active', 'manager_review', 'calibration', 'completed', 'locked'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "review_status_enum" AS ENUM (
        'pending_self', 'pending_manager', 'pending_peer', 'pending_calibration',
        'pending_sign_off', 'completed', 'disputed'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "review_outcome_enum" AS ENUM ('exceeds', 'meets', 'below')
    `);
    await queryRunner.query(`
      CREATE TYPE "probation_outcome_enum" AS ENUM ('confirm', 'extend', 'terminate')
    `);
    await queryRunner.query(`
      CREATE TYPE "peer_feedback_role_enum" AS ENUM ('peer', 'upward')
    `);
    await queryRunner.query(`
      CREATE TYPE "development_plan_status_enum" AS ENUM (
        'draft', 'active', 'completed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "development_action_type_enum" AS ENUM (
        'training', 'mentoring', 'stretch_project', 'skill_target', 'other'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "development_action_status_enum" AS ENUM (
        'pending', 'in_progress', 'completed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "pulse_survey_status_enum" AS ENUM ('draft', 'active', 'closed')
    `);

    await queryRunner.query(`
      CREATE TABLE "organizational_objectives" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "level" "objective_level_enum" NOT NULL,
        "divisionId" uuid,
        "departmentId" uuid,
        "title" character varying(255) NOT NULL,
        "description" text,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "status" "objective_status_enum" NOT NULL DEFAULT 'draft',
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizational_objectives" PRIMARY KEY ("id"),
        CONSTRAINT "FK_org_objectives_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_org_objectives_division" FOREIGN KEY ("divisionId")
          REFERENCES "divisions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_org_objectives_department" FOREIGN KEY ("departmentId")
          REFERENCES "departments"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_org_objectives_tenant_level"
        ON "organizational_objectives" ("tenantId", "level", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "objective_key_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "objectiveId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "targetValue" numeric(12,2),
        "currentValue" numeric(12,2) NOT NULL DEFAULT 0,
        "unit" character varying(50),
        "status" "key_result_status_enum" NOT NULL DEFAULT 'not_started',
        "weightPercent" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_objective_key_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_key_results_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_key_results_objective" FOREIGN KEY ("objectiveId")
          REFERENCES "organizational_objectives"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_key_results_objective"
        ON "objective_key_results" ("tenantId", "objectiveId")
    `);

    await queryRunner.query(`
      CREATE TABLE "performance_cycles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "cycleType" "performance_cycle_type_enum" NOT NULL,
        "status" "performance_cycle_status_enum" NOT NULL DEFAULT 'draft',
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "populationFilter" jsonb NOT NULL DEFAULT '{}',
        "peerFeedbackEnabled" boolean NOT NULL DEFAULT false,
        "ratingScale" character varying(50) NOT NULL DEFAULT 'exceeds_meets_below',
        "calibrationEnabled" boolean NOT NULL DEFAULT false,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_performance_cycles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_performance_cycles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_performance_cycles_tenant_status"
        ON "performance_cycles" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "performance_goals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "keyResultId" uuid,
        "cycleId" uuid,
        "goalType" "goal_type_enum" NOT NULL DEFAULT 'individual',
        "title" character varying(255) NOT NULL,
        "description" text,
        "weightPercent" integer NOT NULL DEFAULT 0,
        "progressPercent" integer NOT NULL DEFAULT 0,
        "progressStatus" "goal_progress_status_enum" NOT NULL DEFAULT 'on_track',
        "status" "goal_status_enum" NOT NULL DEFAULT 'draft',
        "dueDate" date,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ,
        CONSTRAINT "PK_performance_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_performance_goals_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_performance_goals_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_performance_goals_key_result" FOREIGN KEY ("keyResultId")
          REFERENCES "objective_key_results"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_performance_goals_cycle" FOREIGN KEY ("cycleId")
          REFERENCES "performance_cycles"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_performance_goals_worker"
        ON "performance_goals" ("tenantId", "workerId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "goal_check_ins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "goalId" uuid NOT NULL,
        "progressPercent" integer NOT NULL,
        "progressStatus" "goal_progress_status_enum" NOT NULL,
        "notes" text,
        "authorUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_goal_check_ins" PRIMARY KEY ("id"),
        CONSTRAINT "FK_goal_check_ins_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goal_check_ins_goal" FOREIGN KEY ("goalId")
          REFERENCES "performance_goals"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_goal_check_ins_goal"
        ON "goal_check_ins" ("tenantId", "goalId")
    `);

    await queryRunner.query(`
      CREATE TABLE "one_on_one_meetings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "managerWorkerId" uuid NOT NULL,
        "employeeWorkerId" uuid NOT NULL,
        "scheduledAt" TIMESTAMPTZ NOT NULL,
        "status" "one_on_one_status_enum" NOT NULL DEFAULT 'scheduled',
        "agenda" text,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_one_on_one_meetings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_one_on_ones_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_one_on_ones_manager" FOREIGN KEY ("managerWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_one_on_ones_employee" FOREIGN KEY ("employeeWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_one_on_ones_manager"
        ON "one_on_one_meetings" ("tenantId", "managerWorkerId", "scheduledAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_one_on_ones_employee"
        ON "one_on_one_meetings" ("tenantId", "employeeWorkerId", "scheduledAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "one_on_one_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "meetingId" uuid NOT NULL,
        "content" text NOT NULL,
        "isShared" boolean NOT NULL DEFAULT false,
        "authorUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_one_on_one_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_one_on_one_notes_meeting" FOREIGN KEY ("meetingId")
          REFERENCES "one_on_one_meetings"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_one_on_one_notes_meeting"
        ON "one_on_one_notes" ("tenantId", "meetingId")
    `);

    await queryRunner.query(`
      CREATE TABLE "feedback_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "authorWorkerId" uuid NOT NULL,
        "recipientWorkerId" uuid NOT NULL,
        "feedbackType" "feedback_type_enum" NOT NULL,
        "message" text NOT NULL,
        "competencyTag" character varying(100),
        "isPrivate" boolean NOT NULL DEFAULT true,
        "authorUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feedback_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_feedback_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_feedback_author" FOREIGN KEY ("authorWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_feedback_recipient" FOREIGN KEY ("recipientWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_feedback_recipient"
        ON "feedback_entries" ("tenantId", "recipientWorkerId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_feedback_author"
        ON "feedback_entries" ("tenantId", "authorWorkerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "recognition_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "authorWorkerId" uuid NOT NULL,
        "recipientWorkerId" uuid NOT NULL,
        "message" text NOT NULL,
        "valueTag" character varying(100),
        "authorUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recognition_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recognition_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_recognition_author" FOREIGN KEY ("authorWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_recognition_recipient" FOREIGN KEY ("recipientWorkerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_recognition_recipient"
        ON "recognition_entries" ("tenantId", "recipientWorkerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "performance_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "cycleId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "managerWorkerId" uuid,
        "status" "review_status_enum" NOT NULL DEFAULT 'pending_self',
        "selfAssessment" text,
        "managerAssessment" text,
        "outcome" "review_outcome_enum",
        "probationOutcome" "probation_outcome_enum",
        "competencyRatings" jsonb NOT NULL DEFAULT '{}',
        "snapshotGoalIds" jsonb NOT NULL DEFAULT '[]',
        "employeeSignedOff" boolean NOT NULL DEFAULT false,
        "managerSignedOff" boolean NOT NULL DEFAULT false,
        "selfSubmittedAt" TIMESTAMPTZ,
        "managerSubmittedAt" TIMESTAMPTZ,
        "completedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_performance_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_performance_reviews_cycle_worker" UNIQUE ("tenantId", "cycleId", "workerId"),
        CONSTRAINT "FK_performance_reviews_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_performance_reviews_cycle" FOREIGN KEY ("cycleId")
          REFERENCES "performance_cycles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_performance_reviews_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_performance_reviews_cycle_worker"
        ON "performance_reviews" ("tenantId", "cycleId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "performance_review_peer_feedback" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "reviewId" uuid NOT NULL,
        "reviewerWorkerId" uuid NOT NULL,
        "reviewerRole" "peer_feedback_role_enum" NOT NULL DEFAULT 'peer',
        "feedback" text,
        "competencyRatings" jsonb NOT NULL DEFAULT '{}',
        "submittedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_performance_review_peer_feedback" PRIMARY KEY ("id"),
        CONSTRAINT "FK_peer_feedback_review" FOREIGN KEY ("reviewId")
          REFERENCES "performance_reviews"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_peer_feedback_review"
        ON "performance_review_peer_feedback" ("tenantId", "reviewId")
    `);

    await queryRunner.query(`
      CREATE TABLE "development_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "reviewId" uuid,
        "title" character varying(255) NOT NULL,
        "summary" text,
        "status" "development_plan_status_enum" NOT NULL DEFAULT 'draft',
        "employeeSignedOff" boolean NOT NULL DEFAULT false,
        "managerSignedOff" boolean NOT NULL DEFAULT false,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_development_plans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_development_plans_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_development_plans_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_development_plans_review" FOREIGN KEY ("reviewId")
          REFERENCES "performance_reviews"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_development_plans_worker"
        ON "development_plans" ("tenantId", "workerId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "development_plan_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "planId" uuid NOT NULL,
        "actionType" "development_action_type_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "dueDate" date,
        "status" "development_action_status_enum" NOT NULL DEFAULT 'pending',
        "trainingCourseId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_development_plan_actions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_development_actions_plan" FOREIGN KEY ("planId")
          REFERENCES "development_plans"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_development_actions_plan"
        ON "development_plan_actions" ("tenantId", "planId")
    `);

    await queryRunner.query(`
      CREATE TABLE "pulse_surveys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "questions" jsonb NOT NULL DEFAULT '[]',
        "populationFilter" jsonb NOT NULL DEFAULT '{}',
        "anonymityThreshold" integer NOT NULL DEFAULT 5,
        "status" "pulse_survey_status_enum" NOT NULL DEFAULT 'draft',
        "closesAt" date,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pulse_surveys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pulse_surveys_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pulse_surveys_tenant_status"
        ON "pulse_surveys" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "pulse_survey_responses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "surveyId" uuid NOT NULL,
        "respondentWorkerId" uuid NOT NULL,
        "answers" jsonb NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pulse_survey_responses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pulse_responses_survey" FOREIGN KEY ("surveyId")
          REFERENCES "pulse_surveys"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pulse_responses_survey"
        ON "pulse_survey_responses" ("tenantId", "surveyId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pulse_survey_responses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pulse_surveys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "development_plan_actions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "development_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "performance_review_peer_feedback"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "performance_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recognition_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feedback_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "one_on_one_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "one_on_one_meetings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goal_check_ins"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "performance_goals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "performance_cycles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "objective_key_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizational_objectives"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "pulse_survey_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "development_action_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "development_action_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "development_plan_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "peer_feedback_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "probation_outcome_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "review_outcome_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "review_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "performance_cycle_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "performance_cycle_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "one_on_one_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "feedback_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "goal_progress_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "goal_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "goal_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "key_result_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "objective_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "objective_level_enum"`);
  }
}
