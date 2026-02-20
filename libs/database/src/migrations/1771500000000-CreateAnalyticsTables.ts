import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create the four core analytics tables:
 * - projects:   SDK write-key registry per tenant
 * - identities: anonymous-id ↔ user-id resolution map
 * - sessions:   one row per user visit (pre-aggregated metrics)
 * - events:     every tracked action (page view, click, identify, etc.)
 */
export class CreateAnalyticsTables1771500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── projects ──────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "projectId"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId"        UUID NOT NULL,
        "name"            VARCHAR(100) NOT NULL,
        "writeKey"        VARCHAR(100) NOT NULL UNIQUE,
        "allowedOrigins"  TEXT[] NOT NULL DEFAULT '{}',
        "settings"        JSONB,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_projects_tenantId" ON "projects" ("tenantId")`,
    );

    // ── identities ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "identities" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId"    VARCHAR(50) NOT NULL,
        "anonymousId" VARCHAR(100) NOT NULL,
        "userId"      VARCHAR(100) NOT NULL,
        "linkedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "linkSource"  VARCHAR(20) NOT NULL DEFAULT 'identify',
        "traits"      JSONB
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_identities_tenant_anon" ON "identities" ("tenantId", "anonymousId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_identities_tenant_user" ON "identities" ("tenantId", "userId")`,
    );

    // ── sessions ──────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sessionId"       UUID PRIMARY KEY,
        "tenantId"        VARCHAR(50) NOT NULL,
        "anonymousId"     VARCHAR(100) NOT NULL,
        "userId"          VARCHAR(100),
        "startedAt"       TIMESTAMPTZ NOT NULL,
        "endedAt"         TIMESTAMPTZ,
        "durationSeconds" INTEGER NOT NULL DEFAULT 0,
        "eventCount"      SMALLINT NOT NULL DEFAULT 0,
        "pageCount"       SMALLINT NOT NULL DEFAULT 0,
        "entryPage"       VARCHAR(500),
        "referrer"        TEXT,
        "utmSource"       VARCHAR(100),
        "utmMedium"       VARCHAR(100),
        "utmCampaign"     VARCHAR(100),
        "deviceType"      VARCHAR(20),
        "countryCode"     VARCHAR(2),
        "converted"       BOOLEAN NOT NULL DEFAULT FALSE,
        "conversionEvent" VARCHAR(100)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_tenant_startedAt" ON "sessions" ("tenantId", "startedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_userId" ON "sessions" ("userId")`,
    );

    // ── events ────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "eventId"        UUID PRIMARY KEY,
        "messageId"      UUID NOT NULL UNIQUE,
        "tenantId"       VARCHAR(50) NOT NULL,
        "projectId"      VARCHAR(50) NOT NULL,
        "eventName"      VARCHAR(100) NOT NULL,
        "eventType"      VARCHAR(20) NOT NULL DEFAULT 'track',
        "timestamp"      TIMESTAMPTZ NOT NULL,
        "receivedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "anonymousId"    VARCHAR(100) NOT NULL,
        "userId"         VARCHAR(100),
        "sessionId"      VARCHAR(100) NOT NULL,
        "channelType"    VARCHAR(20) NOT NULL DEFAULT 'web',
        "externalId"     VARCHAR(100),
        "handshakeToken" VARCHAR(100),
        "pagePath"       VARCHAR(500),
        "pageUrl"        TEXT,
        "pageTitle"      VARCHAR(500),
        "pageReferrer"   TEXT,
        "userAgent"      TEXT,
        "deviceType"     VARCHAR(20),
        "osName"         VARCHAR(50),
        "osVersion"      VARCHAR(50),
        "browserName"    VARCHAR(50),
        "browserVersion" VARCHAR(50),
        "ipAddress"      INET,
        "countryCode"    VARCHAR(2),
        "city"           VARCHAR(100),
        "properties"     JSONB,
        "sdkVersion"     VARCHAR(20),
        "processedAt"    TIMESTAMPTZ
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_tenant_timestamp" ON "events" ("tenantId", "timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_sessionId" ON "events" ("sessionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_name_timestamp" ON "events" ("eventName", "timestamp")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
  }
}
