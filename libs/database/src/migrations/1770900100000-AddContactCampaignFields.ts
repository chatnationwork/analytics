import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add campaign-ready columns to contacts for audience filtering:
 * - tags: TEXT[] for manual segmentation (e.g. 'vip', 'paid', 'event-2024')
 * - paymentStatus: payment state for paid/unpaid filtering
 * - optedIn: WhatsApp Business API messaging consent
 * - optedInAt: when consent was given
 */
export class AddContactCampaignFields1770900100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "optedIn" BOOLEAN DEFAULT TRUE`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "optedInAt" TIMESTAMP WITH TIME ZONE`,
    );

    // GIN index for efficient tag array queries (e.g. 'vip' = ANY(tags))
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contacts_tags" ON "contacts" USING GIN ("tags")`,
    );

    // Composite index for tenant-scoped payment filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contacts_tenant_paymentStatus" ON "contacts" ("tenantId", "paymentStatus")`,
    );

    // Partial index for opted-in contacts (most campaign queries filter by this)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contacts_tenant_optedIn" ON "contacts" ("tenantId") WHERE "optedIn" = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contacts_tenant_optedIn"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contacts_tenant_paymentStatus"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contacts_tags"`);

    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "optedInAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "optedIn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "paymentStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "tags"`,
    );
  }
}
