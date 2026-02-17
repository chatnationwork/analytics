import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migrate contacts table from composite PK (tenantId, contactId) to UUID PK.
 *
 * Why: New module tables (campaigns, events, surveys, hypecards) need to FK
 * to contacts with a single column. The composite PK makes that impossible.
 *
 * Safety: No existing table has an actual FK constraint to contacts.
 * messages.contactId, inbox_sessions.contactId, and contact_notes.contactId
 * are all plain VARCHAR columns. They continue to work via the unique
 * constraint we add on (tenantId, contactId).
 */
export class MigrateContactUuidPk1770900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasIdColumn = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'contacts' AND column_name = 'id'`,
    );

    if (hasIdColumn.length > 0) {
      return; // Already migrated
    }

    // Step 1: Add UUID id column with default
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN "id" UUID DEFAULT gen_random_uuid()`,
    );

    // Step 2: Backfill existing rows
    await queryRunner.query(
      `UPDATE "contacts" SET "id" = gen_random_uuid() WHERE "id" IS NULL`,
    );

    // Step 3: Make id NOT NULL
    await queryRunner.query(
      `ALTER TABLE "contacts" ALTER COLUMN "id" SET NOT NULL`,
    );

    // Step 4: Drop the composite PK
    // The constraint name comes from the original migration
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "PK_contacts_tenant_contact"`,
    );

    // Step 5: Add UUID as PK
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "PK_contacts_id" PRIMARY KEY ("id")`,
    );

    // Step 6: Add unique constraint on (tenantId, contactId) so existing
    // lookups and upserts continue to work identically
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "UQ_contacts_tenant_contactId" UNIQUE ("tenantId", "contactId")`,
    );

    // Step 7: Drop the old unique index that TypeORM created (now redundant
    // with the unique constraint above)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contacts_tenantId_contactId"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: restore composite PK, drop UUID column

    // Drop UUID PK
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "PK_contacts_id"`,
    );

    // Drop the unique constraint
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "UQ_contacts_tenant_contactId"`,
    );

    // Restore composite PK
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "PK_contacts_tenant_contact" PRIMARY KEY ("tenantId", "contactId")`,
    );

    // Recreate the original unique index
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_contacts_tenantId_contactId" ON "contacts" ("tenantId", "contactId")`,
    );

    // Drop the id column
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "id"`,
    );
  }
}
