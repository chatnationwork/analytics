import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateOwnerRole1769520620638 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Migrate 'owner' role to 'super_admin' in tenant_memberships
        await queryRunner.query(`UPDATE "tenant_memberships" SET "role" = 'super_admin' WHERE "role" = 'owner'`);
        
        // Migrate 'owner' role to 'super_admin' in invitations
        await queryRunner.query(`UPDATE "invitations" SET "role" = 'super_admin' WHERE "role" = 'owner'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert 'super_admin' back to 'owner' (only if we want to reverse, though ambiguous if original was distinct)
        await queryRunner.query(`UPDATE "tenant_memberships" SET "role" = 'owner' WHERE "role" = 'super_admin'`);
        await queryRunner.query(`UPDATE "invitations" SET "role" = 'owner' WHERE "role" = 'super_admin'`);
    }

}
