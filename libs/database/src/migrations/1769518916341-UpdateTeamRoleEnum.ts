import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTeamRoleEnum1769518916341 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Idempotent: only alter if the enum exists (created by AddAgentSystem migration).
        // Skip when running on a fresh DB where add_agent_system may not have run yet.
        const result = await queryRunner.query(
            `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_members_role_enum') AS "exists"`
        );
        const row = Array.isArray(result) ? result[0] : (result as { rows?: { exists: boolean }[] })?.rows?.[0];
        if (row?.exists !== true) return;

        await queryRunner.query(`ALTER TYPE "public"."team_members_role_enum" ADD VALUE IF NOT EXISTS 'admin'`);
        await queryRunner.query(`ALTER TYPE "public"."team_members_role_enum" ADD VALUE IF NOT EXISTS 'sub_admin'`);
        await queryRunner.query(`ALTER TYPE "public"."team_members_role_enum" ADD VALUE IF NOT EXISTS 'agent'`);
        await queryRunner.query(`ALTER TYPE "public"."team_members_role_enum" ADD VALUE IF NOT EXISTS 'viewer'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres does not support removing values from Enums easily.
        // We generally leave them or have to recreate the type. For now, we leave them.
    }

}
