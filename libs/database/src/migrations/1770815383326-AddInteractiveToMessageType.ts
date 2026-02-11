import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInteractiveToMessageType1770815383326 implements MigrationInterface {
    name = 'AddInteractiveToMessageType1770815383326'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."messages_type_enum" ADD VALUE IF NOT EXISTS 'template'`);
        await queryRunner.query(`ALTER TYPE "public"."messages_type_enum" ADD VALUE IF NOT EXISTS 'interactive'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverting enum changes in Postgres is complex and rarely needed.
        // Leaving empty.
    }
}
