import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only esign_audit_events must not CASCADE-delete when an envelope is removed.
 * FLW-DOC-003 / security review blocker.
 */
export class RestrictEsignAuditEnvelopeFk1783038020000
  implements MigrationInterface
{
  name = 'RestrictEsignAuditEnvelopeFk1783038020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "esign_audit_events"
        DROP CONSTRAINT IF EXISTS "FK_esign_audit_events_envelope"
    `);
    await queryRunner.query(`
      ALTER TABLE "esign_audit_events"
        ADD CONSTRAINT "FK_esign_audit_events_envelope"
        FOREIGN KEY ("envelopeId")
        REFERENCES "esign_envelopes"("id")
        ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "esign_audit_events"
        DROP CONSTRAINT IF EXISTS "FK_esign_audit_events_envelope"
    `);
    await queryRunner.query(`
      ALTER TABLE "esign_audit_events"
        ADD CONSTRAINT "FK_esign_audit_events_envelope"
        FOREIGN KEY ("envelopeId")
        REFERENCES "esign_envelopes"("id")
        ON DELETE CASCADE
    `);
  }
}
