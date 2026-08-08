import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEsignTalentPhase1Gaps1783038000000
  implements MigrationInterface
{
  name = 'CreateEsignTalentPhase1Gaps1783038000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "esign_envelope_status_enum" ADD VALUE IF NOT EXISTS 'expired'`,
    );

    await queryRunner.query(`
      CREATE TYPE "esign_signature_method_enum" AS ENUM (
        'draw', 'type', 'upload', 'manual_upload'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "esign_envelopes"
        ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "sealedBlobUrl" character varying(500),
        ADD COLUMN IF NOT EXISTS "certificateBlobUrl" character varying(500),
        ADD COLUMN IF NOT EXISTS "signedCopyBlobUrl" character varying(500),
        ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE "esign_signatories"
        ADD COLUMN IF NOT EXISTS "signatureMethod" "esign_signature_method_enum",
        ADD COLUMN IF NOT EXISTS "signingTokenHash" character varying(128),
        ADD COLUMN IF NOT EXISTS "signingTokenExpiresAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "signingTokenUsedAt" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_esign_signatories_token_hash"
        ON "esign_signatories" ("signingTokenHash")
        WHERE "signingTokenHash" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TYPE "pre_boarding_packet_status_enum" AS ENUM (
        'draft', 'invited', 'in_progress', 'submitted',
        'under_review', 'approved', 'complete', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "pre_boarding_packets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "candidateId" uuid,
        "personalEmail" character varying(255) NOT NULL,
        "status" "pre_boarding_packet_status_enum" NOT NULL DEFAULT 'draft',
        "consentAt" TIMESTAMPTZ,
        "consentIp" inet,
        "templateVersionId" uuid,
        "submittedAt" TIMESTAMPTZ,
        "mergedAt" TIMESTAMPTZ,
        "correlationId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pre_boarding_packets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pre_boarding_packets_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pre_boarding_packets_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pre_boarding_packets_tenant_status"
        ON "pre_boarding_packets" ("tenantId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pre_boarding_packets_worker"
        ON "pre_boarding_packets" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TABLE "pre_boarding_field_values" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "packetId" uuid NOT NULL,
        "fieldKey" character varying(100) NOT NULL,
        "valueEncrypted" bytea,
        "valueText" text,
        "attachmentBlobId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pre_boarding_field_values" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pre_boarding_field_values_packet_key"
          UNIQUE ("tenantId", "packetId", "fieldKey"),
        CONSTRAINT "FK_pre_boarding_field_values_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pre_boarding_field_values_packet" FOREIGN KEY ("packetId")
          REFERENCES "pre_boarding_packets"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "worker_passport_source_enum" AS ENUM (
        'pre_boarding', 'manual', 'renewal'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "worker_passports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "passportNumber" character varying(50) NOT NULL,
        "nationalityCode" character varying(2) NOT NULL,
        "issuingCountryCode" character varying(2) NOT NULL,
        "placeOfIssue" character varying(100),
        "issueDate" date NOT NULL,
        "expiryDate" date NOT NULL,
        "isCurrent" boolean NOT NULL DEFAULT true,
        "source" "worker_passport_source_enum" NOT NULL DEFAULT 'manual',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_worker_passports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_passports_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_worker_passports_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_worker_passports_worker"
        ON "worker_passports" ("tenantId", "workerId")
    `);

    await queryRunner.query(`
      CREATE TYPE "worker_visa_record_type_enum" AS ENUM ('previous', 'current')
    `);
    await queryRunner.query(`
      CREATE TYPE "worker_visa_application_status_enum" AS ENUM (
        'pending_sponsorship', 'application_in_progress', 'ipa_approved',
        'approved', 'stamped', 'issued', 'active', 'renewed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "worker_visa_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "countryCode" character varying(2) NOT NULL,
        "recordType" "worker_visa_record_type_enum" NOT NULL,
        "statusCode" character varying(50) NOT NULL,
        "visaOrPassType" character varying(50),
        "documentNumber" character varying(100),
        "sponsorOrEmployer" character varying(255),
        "uidNumber" character varying(50),
        "labourCardNumber" character varying(50),
        "emiratesId" character varying(50),
        "nric" character varying(20),
        "ipaReference" character varying(100),
        "applicationStatus" "worker_visa_application_status_enum",
        "issueDate" date,
        "expiryDate" date,
        "cancellationDate" date,
        "cancellationReason" text,
        "passportId" uuid,
        "supersededById" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_worker_visa_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_visa_records_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_worker_visa_records_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_worker_visa_records_passport" FOREIGN KEY ("passportId")
          REFERENCES "worker_passports"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_worker_visa_records_worker_country"
        ON "worker_visa_records" ("tenantId", "workerId", "countryCode", "recordType")
    `);

    await queryRunner.query(`
      CREATE TYPE "worker_visa_attachment_type_enum" AS ENUM (
        'passport_bio', 'passport_full', 'previous_visa', 'previous_pass',
        'cancellation_stamp', 'entry_permit', 'labour_card', 'emirates_id',
        'ipa_letter', 'mom_approval', 'other'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "worker_visa_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "visaRecordId" uuid,
        "passportId" uuid,
        "attachmentType" "worker_visa_attachment_type_enum" NOT NULL,
        "blobUrl" character varying(500) NOT NULL,
        "uploadedBy" uuid,
        "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_worker_visa_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_visa_attachments_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_worker_visa_attachments_visa" FOREIGN KEY ("visaRecordId")
          REFERENCES "worker_visa_records"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_worker_visa_attachments_passport" FOREIGN KEY ("passportId")
          REFERENCES "worker_passports"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "exit_interview_status_enum" AS ENUM (
        'draft', 'submitted', 'archived'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "exit_interviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "separationCaseId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "status" "exit_interview_status_enum" NOT NULL DEFAULT 'draft',
        "responses" jsonb NOT NULL DEFAULT '{}',
        "conductedBy" uuid,
        "conductedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exit_interviews" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_exit_interviews_separation"
          UNIQUE ("tenantId", "separationCaseId"),
        CONSTRAINT "FK_exit_interviews_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_exit_interviews_separation" FOREIGN KEY ("separationCaseId")
          REFERENCES "separation_cases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exit_interviews_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "entra_provisioning_job_status_enum" AS ENUM (
        'scheduled', 'running', 'succeeded', 'failed', 'cancelled', 'manual_complete'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "entra_provisioning_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "scheduledFor" TIMESTAMPTZ NOT NULL,
        "status" "entra_provisioning_job_status_enum" NOT NULL DEFAULT 'scheduled',
        "workEmail" character varying(255),
        "entraObjectId" character varying(255),
        "graphCorrelationId" uuid,
        "attemptCount" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "completedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_entra_provisioning_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_entra_provisioning_jobs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_entra_provisioning_jobs_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_entra_provisioning_jobs_status"
        ON "entra_provisioning_jobs" ("tenantId", "status", "scheduledFor")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "entra_provisioning_jobs"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "entra_provisioning_job_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "exit_interviews"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "exit_interview_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_visa_attachments"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "worker_visa_attachment_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_visa_records"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "worker_visa_application_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "worker_visa_record_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_passports"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "worker_passport_source_enum"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "pre_boarding_field_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pre_boarding_packets"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "pre_boarding_packet_status_enum"`,
    );

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_esign_signatories_token_hash"
    `);
    await queryRunner.query(`
      ALTER TABLE "esign_signatories"
        DROP COLUMN IF EXISTS "signingTokenUsedAt",
        DROP COLUMN IF EXISTS "signingTokenExpiresAt",
        DROP COLUMN IF EXISTS "signingTokenHash",
        DROP COLUMN IF EXISTS "signatureMethod"
    `);
    await queryRunner.query(`
      ALTER TABLE "esign_envelopes"
        DROP COLUMN IF EXISTS "lastReminderAt",
        DROP COLUMN IF EXISTS "signedCopyBlobUrl",
        DROP COLUMN IF EXISTS "certificateBlobUrl",
        DROP COLUMN IF EXISTS "sealedBlobUrl",
        DROP COLUMN IF EXISTS "expiresAt"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "esign_signature_method_enum"`,
    );
  }
}
