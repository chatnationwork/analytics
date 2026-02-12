import { MigrationInterface, QueryRunner } from "typeorm";

const DANGER_ZONE_PERMISSIONS = [
  "admin.danger_zone",
  "users.delete",
  "teams.delete",
  "roles.delete",
] as const;

const ROLES_TO_UPDATE = ["system_admin", "super_admin"];

/**
 * Add Danger Zone permissions to system_admin and super_admin.
 * Idempotent: only appends if missing.
 */
export class AddDangerZonePermissions1769523300000 implements MigrationInterface {
  name = "AddDangerZonePermissions1769523300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const roleName of ROLES_TO_UPDATE) {
      for (const perm of DANGER_ZONE_PERMISSIONS) {
        await queryRunner.query(
          `
          UPDATE "roles"
          SET "permissions" = COALESCE("permissions", '[]'::jsonb) || $1::jsonb
          WHERE "name" = $2
            AND "isSystem" = true
            AND NOT (COALESCE("permissions", '[]'::jsonb) @> $1::jsonb)
          `,
          [JSON.stringify(perm), roleName],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const roleName of ROLES_TO_UPDATE) {
      for (const perm of DANGER_ZONE_PERMISSIONS) {
        await queryRunner.query(
          `
          UPDATE "roles"
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
            AND "permissions" @> $3::jsonb
          `,
          [perm, roleName, JSON.stringify(perm)],
        );
      }
    }
  }
}
