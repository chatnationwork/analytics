/**
 * =============================================================================
 * MIGRATION: Add Two-Factor Verification Table
 * =============================================================================
 *
 * Creates the two_fa_verification table for storing pending 2FA login codes.
 * When a user with 2FA enabled logs in, a verification record is created with
 * a unique token and 6-digit code. The user receives the code via WhatsApp
 * and submits token + code to complete login.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTwoFaVerificationTable1769521950000
  implements MigrationInterface
{
  name = "AddTwoFaVerificationTable1769521950000";

  /**
   * Creates the two_fa_verification table with proper indexes and
   * foreign key to users table.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("two_fa_verification");
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "two_fa_verification" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "token" uuid NOT NULL,
          "userId" uuid NOT NULL,
          "code" varchar(10) NOT NULL,
          "expiresAt" timestamptz NOT NULL,
          CONSTRAINT "PK_two_fa_verification_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_two_fa_verification_token" UNIQUE ("token"),
          CONSTRAINT "FK_two_fa_verification_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_two_fa_verification_token" ON "two_fa_verification" ("token")`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_two_fa_verification_expiresAt" ON "two_fa_verification" ("expiresAt")`
      );
    }
  }

  /**
   * Drops the two_fa_verification table and its indexes.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "two_fa_verification"`);
  }
}
