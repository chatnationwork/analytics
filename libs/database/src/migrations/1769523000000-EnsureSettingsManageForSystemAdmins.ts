import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ensure system admin roles (super_admin, admin) have settings.manage permission
 * in the roles table (RoleEntity). Idempotent: only appends if missing.
 */
export class EnsureSettingsManageForSystemAdmins1769523000000
  implements MigrationInterface
{
  name = "EnsureSettingsManageForSystemAdmins1769523000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // roles table: "permissions" jsonb array, "isSystem" boolean, "name" varchar
    // Add 'settings.manage' to permissions array if not already present
    await queryRunner.query(`
      UPDATE "roles"
      SET "permissions" = COALESCE("permissions", '[]'::jsonb) || '"settings.manage"'::jsonb
      WHERE "name" IN ('super_admin', 'admin')
        AND "isSystem" = true
        AND NOT (COALESCE("permissions", '[]'::jsonb) @> '"settings.manage"'::jsonb)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove 'settings.manage' from permissions array (filter it out)
    await queryRunner.query(`
      UPDATE "roles"
      SET "permissions" = COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(elem))
          FROM jsonb_array_elements_text("permissions") AS elem
          WHERE elem <> 'settings.manage'
        ),
        '[]'::jsonb
      )
      WHERE "name" IN ('super_admin', 'admin')
        AND "isSystem" = true
        AND "permissions" @> '"settings.manage"'::jsonb
    `);
  }
}
