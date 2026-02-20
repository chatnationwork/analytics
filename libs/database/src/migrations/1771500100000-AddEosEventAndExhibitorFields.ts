import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Backfill columns added to EOS entities after the initial CreateEosTables migration:
 *
 * eos_events:
 *   - created_by_id / updated_by_id  (audit trail — who created/last edited)
 *   - grace_period_hours             (hours after ends_at checkins are still allowed)
 *   - grace_period_ends_at           (computed deadline for grace-period checkins)
 *
 * eos_exhibitors:
 *   - invitation_token  (unique token sent to exhibitor to accept/register)
 *   - invited_at        (when the invitation was sent)
 *   - booth_token       (unique token used by exhibitor to access their booth QR scanner)
 *
 * Note: the AddInvitationFieldsToExhibitors migration (1771484103217) is
 * misnamed — it creates the payments table, not these exhibitor fields.
 */
export class AddEosEventAndExhibitorFields1771500100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── eos_events ────────────────────────────────────────────────────────

    await queryRunner.query(
      `ALTER TABLE "eos_events" ADD COLUMN IF NOT EXISTS "created_by_id" VARCHAR`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_events" ADD COLUMN IF NOT EXISTS "updated_by_id" VARCHAR`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_events" ADD COLUMN IF NOT EXISTS "grace_period_hours" INTEGER NOT NULL DEFAULT 24`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_events" ADD COLUMN IF NOT EXISTS "grace_period_ends_at" TIMESTAMPTZ`,
    );

    // ── eos_exhibitors ────────────────────────────────────────────────────

    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD COLUMN IF NOT EXISTS "invitation_token" VARCHAR(255) UNIQUE`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD COLUMN IF NOT EXISTS "invited_at" TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD COLUMN IF NOT EXISTS "booth_token" VARCHAR(255) UNIQUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP COLUMN IF EXISTS "booth_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP COLUMN IF EXISTS "invited_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP COLUMN IF EXISTS "invitation_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_events" DROP COLUMN IF EXISTS "grace_period_ends_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_events" DROP COLUMN IF EXISTS "grace_period_hours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_events" DROP COLUMN IF EXISTS "updated_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_events" DROP COLUMN IF EXISTS "created_by_id"`,
    );
  }
}
