import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateRbacRolesOneWay1769527000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Migrate Tenant Memberships (Global Roles)
    // admin -> super_admin
    await queryRunner.query(`
      UPDATE "tenant_memberships"
      SET "role" = 'super_admin'
      WHERE "role" = 'admin'
    `);

    // member -> agent
    await queryRunner.query(`
      UPDATE "tenant_memberships"
      SET "role" = 'agent'
      WHERE "role" = 'member'
    `);

    // 2. Note: Team Roles in 'team_members' table use 'manager' and 'agent'. 
    // They are fine as is ('manager' is still valid in team context).
    // The deprecated global roles 'admin' and 'member' are now effectively migrated.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // One-way migration as per requirements, but for safety:
    // super_admin -> admin
    await queryRunner.query(`
      UPDATE "tenant_memberships"
      SET "role" = 'admin'
      WHERE "role" = 'super_admin'
    `);

    // agent -> member
    await queryRunner.query(`
      UPDATE "tenant_memberships"
      SET "role" = 'member'
      WHERE "role" = 'agent'
    `);
  }
}
