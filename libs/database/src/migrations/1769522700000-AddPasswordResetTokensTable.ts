import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetTokensTable1769522700000 implements MigrationInterface {
  name = "AddPasswordResetTokensTable1769522700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("password_reset_tokens");
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "password_reset_tokens" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "tokenHash" varchar(64) NOT NULL,
          "userId" uuid NOT NULL,
          "expiresAt" timestamptz NOT NULL,
          CONSTRAINT "PK_password_reset_tokens_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_password_reset_tokens_tokenHash" UNIQUE ("tokenHash"),
          CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_password_reset_tokens_tokenHash" ON "password_reset_tokens" ("tokenHash")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_expiresAt" ON "password_reset_tokens" ("expiresAt")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
