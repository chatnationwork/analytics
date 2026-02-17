import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds isActive column to team_members.
 * TeamMemberEntity expects this column; add_agent_system did not include it.
 */
export class AddTeamMemberIsActive1769521790000 implements MigrationInterface {
  name = "AddTeamMemberIsActive1769521790000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("team_members");
    if (!hasTable) return;

    await queryRunner.query(
      `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP COLUMN IF EXISTS "isActive"`
    );
  }
}
