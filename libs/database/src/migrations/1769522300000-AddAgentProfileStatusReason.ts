import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentProfileStatusReason1769522300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent_profiles"
      ADD COLUMN IF NOT EXISTS "statusReason" character varying(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent_profiles" DROP COLUMN IF EXISTS "statusReason"
    `);
  }
}
