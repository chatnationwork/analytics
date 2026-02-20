import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvitationFieldsToExhibitors1771484103217 implements MigrationInterface {
  name = "AddInvitationFieldsToExhibitors1771484103217";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD COLUMN IF NOT EXISTS "invitation_token" VARCHAR(255) UNIQUE`
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD COLUMN IF NOT EXISTS "invited_at" TIMESTAMPTZ`
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD COLUMN IF NOT EXISTS "booth_token" VARCHAR(255) UNIQUE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP COLUMN IF EXISTS "booth_token"`
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP COLUMN IF EXISTS "invited_at"`
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP COLUMN IF EXISTS "invitation_token"`
    );
  }
}
