/**
 * =============================================================================
 * MIGRATION: Add Contact Profile Columns
 * =============================================================================
 *
 * Adds profile columns to the contacts table:
 * - pin: Tax ID or KRA PIN
 * - yearOfBirth: Year of birth for age verification
 * - email: Contact email address
 * - metadata: JSONB for additional custom fields
 *
 * These columns enable agents to store and edit contact profile information.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactProfileColumns1769522100000
  implements MigrationInterface
{
  name = "AddContactProfileColumns1769522100000";

  /**
   * Adds pin, yearOfBirth, email, and metadata columns to contacts table.
   * Uses IF NOT EXISTS for idempotency.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "pin" varchar(50) DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "yearOfBirth" int DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "email" varchar(255) DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT NULL`
    );
  }

  /**
   * Removes the profile columns from contacts table.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "metadata"`
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "email"`
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "yearOfBirth"`
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "pin"`
    );
  }
}
