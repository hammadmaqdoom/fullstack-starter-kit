import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHelpDeskTickets1783039300000
  implements MigrationInterface
{
  name = 'CreateHelpDeskTickets1783039300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "help_desk_queue_enum" AS ENUM ('hr', 'it', 'admin', 'finance')
    `);
    await queryRunner.query(`
      CREATE TYPE "help_desk_priority_enum" AS ENUM ('p1', 'p2', 'p3', 'p4')
    `);
    await queryRunner.query(`
      CREATE TYPE "help_desk_status_enum" AS ENUM (
        'open', 'in_progress', 'waiting_on_employee', 'resolved', 'closed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "help_desk_sla_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "queue" "help_desk_queue_enum" NOT NULL,
        "priority" "help_desk_priority_enum" NOT NULL,
        "slaTargetHours" int NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_help_desk_sla_policies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_help_desk_sla_policies_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_help_desk_sla_policies_tenant_queue_priority"
        ON "help_desk_sla_policies" ("tenantId", "queue", "priority")
    `);

    await queryRunner.query(`
      CREATE TABLE "help_desk_tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "requesterId" uuid NOT NULL,
        "assigneeId" uuid,
        "queue" "help_desk_queue_enum" NOT NULL,
        "subject" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "priority" "help_desk_priority_enum" NOT NULL DEFAULT 'p3',
        "status" "help_desk_status_enum" NOT NULL DEFAULT 'open',
        "attachments" jsonb NOT NULL DEFAULT '[]',
        "slaTargetHours" int,
        "slaDueAt" TIMESTAMPTZ,
        "slaBreached" boolean NOT NULL DEFAULT false,
        "resolvedAt" TIMESTAMPTZ,
        "closedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_help_desk_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_help_desk_tickets_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_help_desk_tickets_requester" FOREIGN KEY ("requesterId")
          REFERENCES "workers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_help_desk_tickets_assignee" FOREIGN KEY ("assigneeId")
          REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_help_desk_tickets_tenant_requester"
        ON "help_desk_tickets" ("tenantId", "requesterId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_help_desk_tickets_tenant_queue_status"
        ON "help_desk_tickets" ("tenantId", "queue", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_help_desk_tickets_tenant_assignee"
        ON "help_desk_tickets" ("tenantId", "assigneeId")
    `);

    await queryRunner.query(`
      CREATE TABLE "ticket_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "ticketId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "body" text NOT NULL,
        "isInternal" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_comments_ticket" FOREIGN KEY ("ticketId")
          REFERENCES "help_desk_tickets"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ticket_comments_tenant_ticket"
        ON "ticket_comments" ("tenantId", "ticketId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ticket_comments"`);
    await queryRunner.query(`DROP TABLE "help_desk_tickets"`);
    await queryRunner.query(`DROP TABLE "help_desk_sla_policies"`);
    await queryRunner.query(`DROP TYPE "help_desk_status_enum"`);
    await queryRunner.query(`DROP TYPE "help_desk_priority_enum"`);
    await queryRunner.query(`DROP TYPE "help_desk_queue_enum"`);
  }
}
