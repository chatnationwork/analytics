/**
 * =============================================================================
 * MIGRATION: Add User Two-Factor Authentication Columns
 * =============================================================================
 *
 * Adds twoFactorEnabled and phone columns to the users table to support
 * two-factor authentication via WhatsApp.
 *
 * - twoFactorEnabled: boolean flag indicating if 2FA is enabled for the user
 * - phone: stores the user's phone number for receiving 2FA codes via WhatsApp
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTwoFactorColumns1769521900000
  implements MigrationInterface
{
  name = "AddUserTwoFactorColumns1769521900000";

  /**
   * Applies the migration by adding twoFactorEnabled and phone columns
   * to the users table.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20) DEFAULT NULL`
    );
  }

  /**
   * Reverts the migration by removing twoFactorEnabled and phone columns
   * from the users table.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled"`
    );
  }
}
