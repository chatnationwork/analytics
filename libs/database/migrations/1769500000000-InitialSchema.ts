/**
 * Initial schema migration for fresh database deployment.
 * Creates base tables required before add_agent_system and subsequent migrations.
 * Idempotent: uses IF NOT EXISTS where applicable for safe re-runs.
 */
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769500000000 implements MigrationInterface {
  name = "InitialSchema1769500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "name" character varying,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "avatarUrl" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lastLoginAt" TIMESTAMP WITH TIME ZONE,
        "twoFactorEnabled" boolean NOT NULL DEFAULT false,
        "phone" character varying(20),
        "passwordChangedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email" ON "users" ("email")`
    );

    // tenants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "plan" character varying NOT NULL DEFAULT 'free',
        "settings" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenants_slug" ON "tenants" ("slug")`
    );

    // tenant_memberships (MigrateOwnerRole expects this table; role supports 'owner','admin','member')
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_memberships" (
        "userId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "role" character varying NOT NULL DEFAULT 'agent',
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "isActive" boolean NOT NULL DEFAULT true,
        "invitedBy" uuid,
        "roleId" uuid,
        CONSTRAINT "PK_tenant_memberships" PRIMARY KEY ("userId","tenantId"),
        CONSTRAINT "FK_tenant_memberships_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_memberships_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_memberships_tenant_user" ON "tenant_memberships" ("tenantId","userId")`
    );

    // roles (required by tenant_memberships.roleId and later migrations)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "tenantId" character varying,
        "isSystem" boolean NOT NULL DEFAULT false,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // invitations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "tenantId" uuid NOT NULL,
        "role" character varying NOT NULL DEFAULT 'member',
        "token" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdBy" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invitations_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invitations_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitations_email" ON "invitations" ("email")`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invitations_token" ON "invitations" ("token")`
    );

    // projects
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "projectId" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "writeKey" character varying(100) NOT NULL,
        "allowedOrigins" text[] NOT NULL DEFAULT '{}',
        "settings" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("projectId"),
        CONSTRAINT "UQ_projects_writeKey" UNIQUE ("writeKey")
      )
    `);

    // events
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "eventId" uuid NOT NULL,
        "messageId" uuid NOT NULL,
        "tenantId" character varying(50) NOT NULL,
        "projectId" character varying(50) NOT NULL,
        "eventName" character varying(100) NOT NULL,
        "eventType" character varying(20) NOT NULL DEFAULT 'track',
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "anonymousId" character varying(100) NOT NULL,
        "userId" character varying(100),
        "sessionId" character varying(100) NOT NULL,
        "channelType" character varying(20) NOT NULL DEFAULT 'web',
        "externalId" character varying(100),
        "handshakeToken" character varying(100),
        "properties" jsonb,
        "context" jsonb,
        CONSTRAINT "PK_events" PRIMARY KEY ("eventId"),
        CONSTRAINT "UQ_events_messageId" UNIQUE ("messageId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_tenant_timestamp" ON "events" ("tenantId","timestamp")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_sessionId" ON "events" ("sessionId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_eventName_timestamp" ON "events" ("eventName","timestamp")`
    );

    // sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sessionId" uuid NOT NULL,
        "tenantId" character varying(50) NOT NULL,
        "anonymousId" character varying(100) NOT NULL,
        "userId" character varying(100),
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endedAt" TIMESTAMP WITH TIME ZONE,
        "durationSeconds" integer NOT NULL DEFAULT 0,
        "eventCount" smallint NOT NULL DEFAULT 0,
        "pageCount" smallint NOT NULL DEFAULT 0,
        "entryPage" character varying(500),
        "referrer" text,
        "utmSource" character varying(100),
        "utmMedium" character varying(100),
        "utmCampaign" character varying(100),
        "deviceType" character varying(20),
        "countryCode" character varying(2),
        "converted" boolean NOT NULL DEFAULT false,
        "conversionEvent" character varying(100),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("sessionId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_tenant_startedAt" ON "sessions" ("tenantId","startedAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_userId" ON "sessions" ("userId")`
    );

    // identities
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "identities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" character varying(50) NOT NULL,
        "anonymousId" character varying(100) NOT NULL,
        "userId" character varying(100) NOT NULL,
        "linkedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "linkSource" character varying(20) NOT NULL DEFAULT 'identify',
        "traits" jsonb,
        CONSTRAINT "PK_identities" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_identities_tenant_anonymousId" ON "identities" ("tenantId","anonymousId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_identities_tenant_userId" ON "identities" ("tenantId","userId")`
    );

    // crm_integrations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_integrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "apiUrl" character varying NOT NULL,
        "apiKeyEncrypted" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_integrations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crm_integrations_tenantId" ON "crm_integrations" ("tenantId")`
    );

    // api_keys
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "projectId" uuid,
        "name" character varying NOT NULL,
        "keyPrefix" character varying NOT NULL,
        "keyHash" character varying NOT NULL,
        "type" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_tenantId" ON "api_keys" ("tenantId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_keyPrefix" ON "api_keys" ("keyPrefix")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_integrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
