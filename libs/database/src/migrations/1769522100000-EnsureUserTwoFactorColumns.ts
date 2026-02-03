/**
 * =============================================================================
 * MIGRATION: Ensure User Two-Factor Columns Exist
 * =============================================================================
 *
 * Idempotent migration: adds twoFactorEnabled and phone to users if missing.
 * Use when the DB was restored or migration table is out of sync with schema.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class EnsureUserTwoFactorColumns1769522100000
  implements MigrationInterface
{
  name = "EnsureUserTwoFactorColumns1769522100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20) DEFAULT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled"`
    );
  }
}
