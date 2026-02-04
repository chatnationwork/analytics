import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add settings.password_complexity to role_permissions_permission_enum
 * so the new permission can be used (e.g. for super_admin).
 */
export class AddPasswordComplexityPermission1769522200000 implements MigrationInterface {
  name = "AddPasswordComplexityPermission1769522200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'role_permissions_permission_enum' AND e.enumlabel = 'settings.password_complexity') AS "exists"`,
    );
    const row = Array.isArray(result)
      ? result[0]
      : (result as { rows?: { exists: boolean }[] })?.rows?.[0];
    if (row?.exists === true) return;

    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" ADD VALUE 'settings.password_complexity'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing an enum value easily; leave the value in place.
    // If you must remove it, you would need to recreate the enum and the column.
  }
}
