import { MigrationInterface, QueryRunner } from "typeorm";

export class SplitRbacRoles1769520216566 implements MigrationInterface {
  name = "SplitRbacRoles1769520216566";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: skip if new enum value already exists (migration already applied)
    const result = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'role_permissions_permission_enum' AND e.enumlabel = 'teams.manage') AS "exists"`,
    );
    const row = Array.isArray(result)
      ? result[0]
      : (result as { rows?: { exists: boolean }[] })?.rows?.[0];
    if (row?.exists === true) return;

    // Truncate table to avoid enum conversion errors for obsolete permissions
    await queryRunner.query(`TRUNCATE TABLE "role_permissions"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_9c116ac03805ca80baf3e8d231"`,
    );
    await queryRunner.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_permissions_permission_enum') THEN
              ALTER TYPE "public"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old";
            END IF;
          END $$;
        `);
    await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_permissions_permission_enum') THEN
              CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('analytics.view', 'analytics.export', 'settings.manage', 'users.manage', 'teams.manage', 'audit.view', 'team.settings', 'team.analytics', 'session.view', 'session.manage', 'agent.assign');
            END IF;
          END $$;
        `);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "permission" TYPE "public"."role_permissions_permission_enum" USING "permission"::"text"::"public"."role_permissions_permission_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9c116ac03805ca80baf3e8d231" ON "role_permissions" ("role", "permission")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c116ac03805ca80baf3e8d231"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum_old" AS ENUM('analytics.view', 'analytics.export', 'team.create', 'team.update', 'team.delete', 'team.manage_members', 'session.view', 'session.manage', 'session.assign', 'settings.manage')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "permission" TYPE "public"."role_permissions_permission_enum_old" USING "permission"::"text"::"public"."role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."role_permissions_permission_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "role_permissions" ("permission", "role") `,
    );
  }
}
