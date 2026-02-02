import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamWrapUpReport1769521000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "wrapUpReport" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN IF EXISTS "wrapUpReport"`,
    );
  }
}
