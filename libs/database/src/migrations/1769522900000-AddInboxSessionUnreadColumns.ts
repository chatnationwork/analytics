import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds lastReadAt and lastInboundMessageAt to inbox_sessions for unread indicator.
 * - lastReadAt: when the assigned agent last viewed the chat or sent a message.
 * - lastInboundMessageAt: when the customer last sent a message (updated on each inbound message).
 * Frontend can show "unread" when lastInboundMessageAt > lastReadAt.
 */
export class AddInboxSessionUnreadColumns1769522900000
  implements MigrationInterface
{
  name = "AddInboxSessionUnreadColumns1769522900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inbox_sessions" ADD COLUMN IF NOT EXISTS "lastReadAt" TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE "inbox_sessions" ADD COLUMN IF NOT EXISTS "lastInboundMessageAt" TIMESTAMPTZ`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inbox_sessions" DROP COLUMN IF EXISTS "lastInboundMessageAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inbox_sessions" DROP COLUMN IF EXISTS "lastReadAt"`,
    );
  }
}
