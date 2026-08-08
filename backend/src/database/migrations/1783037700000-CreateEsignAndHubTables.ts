import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEsignAndHubTables1783037700000 implements MigrationInterface {
  name = 'CreateEsignAndHubTables1783037700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "esign_envelope_status_enum" AS ENUM (
        'draft', 'sent', 'partially_signed', 'completed', 'voided', 'declined'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "esign_signatory_status_enum" AS ENUM (
        'pending', 'signed', 'declined'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "esign_field_type_enum" AS ENUM (
        'signature', 'initials', 'date', 'text'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "esign_envelopes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "status" "esign_envelope_status_enum" NOT NULL DEFAULT 'draft',
        "documentBlobUrl" character varying(500),
        "createdBy" uuid NOT NULL,
        "completedAt" TIMESTAMPTZ,
        "voidedReason" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_esign_envelopes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_esign_envelopes_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_esign_envelopes_tenant_status"
        ON "esign_envelopes" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "esign_signatories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "envelopeId" uuid NOT NULL,
        "workerId" uuid,
        "email" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "signingOrder" integer NOT NULL,
        "status" "esign_signatory_status_enum" NOT NULL DEFAULT 'pending',
        "signedAt" TIMESTAMPTZ,
        "signatureBlobUrl" character varying(500),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_esign_signatories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_esign_signatories_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_esign_signatories_envelope" FOREIGN KEY ("envelopeId")
          REFERENCES "esign_envelopes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_esign_signatories_worker" FOREIGN KEY ("workerId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_esign_signatories_envelope"
        ON "esign_signatories" ("envelopeId", "signingOrder")
    `);

    await queryRunner.query(`
      CREATE TABLE "esign_fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "envelopeId" uuid NOT NULL,
        "signatoryId" uuid NOT NULL,
        "fieldType" "esign_field_type_enum" NOT NULL,
        "page" integer NOT NULL,
        "x" double precision NOT NULL,
        "y" double precision NOT NULL,
        "width" double precision NOT NULL,
        "height" double precision NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_esign_fields" PRIMARY KEY ("id"),
        CONSTRAINT "FK_esign_fields_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_esign_fields_envelope" FOREIGN KEY ("envelopeId")
          REFERENCES "esign_envelopes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_esign_fields_signatory" FOREIGN KEY ("signatoryId")
          REFERENCES "esign_signatories"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_esign_fields_envelope"
        ON "esign_fields" ("envelopeId")
    `);

    await queryRunner.query(`
      CREATE TABLE "esign_audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "envelopeId" uuid NOT NULL,
        "actorId" uuid,
        "action" character varying(100) NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_esign_audit_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_esign_audit_events_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_esign_audit_events_envelope" FOREIGN KEY ("envelopeId")
          REFERENCES "esign_envelopes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_esign_audit_events_envelope_created"
        ON "esign_audit_events" ("tenantId", "envelopeId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "hub_saved_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "filters" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hub_saved_views" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hub_saved_views_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_hub_saved_views_user"
        ON "hub_saved_views" ("tenantId", "userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hub_saved_views"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "esign_audit_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "esign_fields"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "esign_signatories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "esign_envelopes"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "esign_field_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "esign_signatory_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "esign_envelope_status_enum"`);
  }
}
