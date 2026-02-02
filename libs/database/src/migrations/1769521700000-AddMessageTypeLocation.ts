import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add 'location' to the message type enum (used for WhatsApp location messages).
 * Idempotent: skip if value already exists.
 * Resolves enum type from information_schema (works regardless of TypeORM enum naming).
 */
export class AddMessageTypeLocation1769521700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find the enum type used by messages.type and add 'location' if not present
    await queryRunner.query(
      `DO $$
      DECLARE
        enum_name text;
      BEGIN
        SELECT udt_name INTO enum_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'type';
        IF enum_name IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = enum_name AND e.enumlabel = 'location'
        ) THEN
          EXECUTE format('ALTER TYPE %I ADD VALUE ''location''', enum_name);
        END IF;
      END $$`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing an enum value easily; leave as no-op.
  }
}
