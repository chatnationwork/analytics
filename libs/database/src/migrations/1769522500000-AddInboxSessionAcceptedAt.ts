import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInboxSessionAcceptedAt1769522500000 implements MigrationInterface {
  name = "AddInboxSessionAcceptedAt1769522500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inbox_sessions" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMPTZ`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inbox_sessions" DROP COLUMN IF EXISTS "acceptedAt"`,
    );
  }
}
