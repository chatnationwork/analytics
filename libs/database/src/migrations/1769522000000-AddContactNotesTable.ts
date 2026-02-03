/**
 * =============================================================================
 * MIGRATION: Add Contact Notes Table
 * =============================================================================
 *
 * Creates the contact_notes table for storing agent notes about contacts.
 * Each note is linked to a contact (tenantId + contactId) and an author (userId).
 * This enables agents to add and view notes about contacts they interact with.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactNotesTable1769522000000 implements MigrationInterface {
  name = "AddContactNotesTable1769522000000";

  /**
   * Creates the contact_notes table with proper indexes and foreign key
   * to the users table for tracking note authors.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("contact_notes");
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "contact_notes" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "tenantId" varchar(50) NOT NULL,
          "contactId" varchar(100) NOT NULL,
          "authorId" uuid NOT NULL,
          "content" text NOT NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "PK_contact_notes_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_contact_notes_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_contact_notes_tenant_contact" ON "contact_notes" ("tenantId", "contactId")`
      );
    }
  }

  /**
   * Drops the contact_notes table and its indexes.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_notes"`);
  }
}
