import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create the three campaign tables:
 * - campaigns: broadcast definitions with audience filters and message templates
 * - campaign_messages: per-recipient delivery log with status tracking
 * - campaign_schedules: recurring campaign configuration
 */
export class CreateCampaignTables1770900200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── campaigns ──────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE "campaign_type_enum" AS ENUM (
        'manual', 'event_triggered', 'scheduled', 'module_initiated'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "campaign_status_enum" AS ENUM (
        'draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "campaigns" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId"            VARCHAR(50) NOT NULL,
        "name"                VARCHAR(255) NOT NULL,
        "type"                "campaign_type_enum" NOT NULL,
        "status"              "campaign_status_enum" NOT NULL DEFAULT 'draft',
        "sourceModule"        VARCHAR(50),
        "sourceReferenceId"   VARCHAR(100),
        "messageTemplate"     JSONB NOT NULL,
        "audienceFilter"      JSONB,
        "recipientCount"      INTEGER NOT NULL DEFAULT 0,
        "scheduledAt"         TIMESTAMPTZ,
        "startedAt"           TIMESTAMPTZ,
        "completedAt"         TIMESTAMPTZ,
        "estimatedCompletionAt" TIMESTAMPTZ,
        "triggerType"         VARCHAR(50),
        "triggerConfig"       JSONB,
        "createdBy"           UUID,
        "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_tenant_status" ON "campaigns" ("tenantId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_tenant_createdAt" ON "campaigns" ("tenantId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_tenant_sourceModule" ON "campaigns" ("tenantId", "sourceModule")`,
    );

    // ── campaign_messages ──────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE "campaign_message_status_enum" AS ENUM (
        'pending', 'queued', 'sent', 'delivered', 'read', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "campaign_messages" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaignId"      UUID NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
        "tenantId"        VARCHAR(50) NOT NULL,
        "contactId"       UUID NOT NULL REFERENCES "contacts"("id"),
        "recipientPhone"  VARCHAR(20) NOT NULL,
        "status"          "campaign_message_status_enum" NOT NULL DEFAULT 'pending',
        "waMessageId"     VARCHAR(100),
        "errorMessage"    TEXT,
        "errorCode"       VARCHAR(50),
        "attempts"        INTEGER NOT NULL DEFAULT 0,
        "isBusinessInitiated" BOOLEAN NOT NULL DEFAULT TRUE,
        "sentAt"          TIMESTAMPTZ,
        "deliveredAt"     TIMESTAMPTZ,
        "readAt"          TIMESTAMPTZ,
        "failedAt"        TIMESTAMPTZ,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_cm_campaignId" ON "campaign_messages" ("campaignId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cm_tenant_campaignId" ON "campaign_messages" ("tenantId", "campaignId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cm_contactId" ON "campaign_messages" ("contactId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cm_status" ON "campaign_messages" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cm_waMessageId" ON "campaign_messages" ("waMessageId")`,
    );

    // ── campaign_schedules ─────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "campaign_schedules" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaignId"      UUID NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
        "tenantId"        VARCHAR(50) NOT NULL,
        "cronExpression"  VARCHAR(100),
        "nextRunAt"       TIMESTAMPTZ NOT NULL,
        "lastRunAt"       TIMESTAMPTZ,
        "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
        "maxRuns"         INTEGER,
        "runCount"        INTEGER NOT NULL DEFAULT 0,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_cs_tenant_isActive" ON "campaign_schedules" ("tenantId", "isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cs_nextRunAt" ON "campaign_schedules" ("nextRunAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaign_message_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaign_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "campaign_type_enum"`);
  }
}
