/**
 * Adds a lastActivityAt column to user_sessions for server-side inactivity tracking.
 * Every authenticated API call updates this column; the JWT guard rejects requests
 * when the gap exceeds the tenant's inactivityTimeoutMinutes setting.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSessionLastActivityAt1769523200000
  implements MigrationInterface
{
  name = "AddUserSessionLastActivityAt1769523200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_sessions"
      ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_sessions"
      DROP COLUMN IF EXISTS "lastActivityAt"
    `);
  }
}
