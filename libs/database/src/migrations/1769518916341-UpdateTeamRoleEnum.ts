import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTeamRoleEnum1769518916341 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums in Postgres cannot be created inside a transaction if we use ALTER TYPE inside a transaction block in some versions, 
        // but typically ADD VALUE is safe. However, to be safe we can run outside transaction or accept it.
        // TypeORM runs migrations in transaction by default.
        
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
