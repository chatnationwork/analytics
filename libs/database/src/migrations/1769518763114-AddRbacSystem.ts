import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRbacSystem1769518763114 implements MigrationInterface {
    name = 'AddRbacSystem1769518763114'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('analytics.view', 'analytics.export', 'team.create', 'team.update', 'team.delete', 'team.manage_members', 'session.view', 'session.manage', 'session.assign', 'settings.manage')`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" character varying NOT NULL, "permission" "public"."role_permissions_permission_enum" NOT NULL, "tenantId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9c116ac03805ca80baf3e8d231" ON "role_permissions" ("role", "permission") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9c116ac03805ca80baf3e8d231"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TYPE "public"."role_permissions_permission_enum"`);
    }

}
