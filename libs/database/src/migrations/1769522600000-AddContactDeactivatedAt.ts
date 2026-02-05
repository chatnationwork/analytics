import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add deactivatedAt to contacts for soft deactivate (admins only via contacts.deactivate permission).
 * When set, contact is excluded from list and export.
 */
export class AddContactDeactivatedAt1769522600000 implements MigrationInterface {
  name = "AddContactDeactivatedAt1769522600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "deactivatedAt"`,
    );
  }
}
