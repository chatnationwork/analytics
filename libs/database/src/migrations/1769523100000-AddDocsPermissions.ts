/**
 * Migration to add docs.* permissions to the role_permissions_permission_enum
 * and seed them into the system roles in the roles table.
 *
 * Permission mapping:
 * - super_admin: docs.agent, docs.supervisor, docs.admin, docs.developer
 * - admin: docs.agent, docs.supervisor, docs.admin
 * - member: docs.agent
 */
import { MigrationInterface, QueryRunner } from "typeorm";

const DOCS_PERMISSIONS = [
  "docs.agent",
  "docs.supervisor",
  "docs.admin",
  "docs.developer",
] as const;

/** Which docs permissions each system role should receive */
const ROLE_DOCS: Record<string, readonly string[]> = {
  super_admin: ["docs.agent", "docs.supervisor", "docs.admin", "docs.developer"],
  admin: ["docs.agent", "docs.supervisor", "docs.admin"],
  member: ["docs.agent"],
};

export class AddDocsPermissions1769523100000 implements MigrationInterface {
  name = "AddDocsPermissions1769523100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new enum values to role_permissions_permission_enum
    for (const perm of DOCS_PERMISSIONS) {
      const result = await queryRunner.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'role_permissions_permission_enum'
            AND e.enumlabel = $1
        ) AS "exists"`,
        [perm],
      );
      const row = Array.isArray(result)
        ? result[0]
        : (result as { rows?: { exists: boolean }[] })?.rows?.[0];
      if (row?.exists === true) continue;

      await queryRunner.query(
        `ALTER TYPE "public"."role_permissions_permission_enum" ADD VALUE '${perm}'`,
      );
    }

    // 2. Seed docs permissions into the roles table (jsonb permissions array)
    for (const [roleName, perms] of Object.entries(ROLE_DOCS)) {
      for (const perm of perms) {
        await queryRunner.query(
          `UPDATE "roles"
           SET "permissions" = COALESCE("permissions", '[]'::jsonb) || $1::jsonb
           WHERE "name" = $2
             AND "isSystem" = true
             AND NOT (COALESCE("permissions", '[]'::jsonb) @> $1::jsonb)`,
          [JSON.stringify(perm), roleName],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove docs permissions from system roles
    for (const [roleName, perms] of Object.entries(ROLE_DOCS)) {
      for (const perm of perms) {
        await queryRunner.query(
          `UPDATE "roles"
           SET "permissions" = COALESCE(
             (
               SELECT jsonb_agg(to_jsonb(elem))
               FROM jsonb_array_elements_text("permissions") AS elem
               WHERE elem <> $1
             ),
             '[]'::jsonb
           )
           WHERE "name" = $2
             AND "isSystem" = true
             AND "permissions" @> $3::jsonb`,
          [perm, roleName, JSON.stringify(perm)],
        );
      }
    }
    // Note: PostgreSQL does not support removing enum values easily; leaving them in place.
  }
}
