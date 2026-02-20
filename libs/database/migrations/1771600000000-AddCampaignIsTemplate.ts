import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add isTemplate to campaigns for saved/reusable templates.
 */
export class AddCampaignIsTemplate1771600000000 implements MigrationInterface {
  name = "AddCampaignIsTemplate1771600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD COLUMN IF NOT EXISTS "isTemplate" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_campaigns_tenant_isTemplate"
      ON "campaigns" ("tenantId", "isTemplate")
      WHERE "isTemplate" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_campaigns_tenant_isTemplate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "isTemplate"`,
    );
  }
}
