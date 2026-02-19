import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCampaignTemplates1770900500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── templates ──────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE "template_status_enum" AS ENUM (
        'approved', 'rejected', 'pending'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId"    VARCHAR(50) NOT NULL,
        "name"        VARCHAR(255) NOT NULL,
        "language"    VARCHAR(10) NOT NULL,
        "category"    VARCHAR(50),
        "structure"   JSONB NOT NULL,
        "bodyText"    TEXT,
        "variables"   JSONB NOT NULL DEFAULT '[]',
        "status"      "template_status_enum" NOT NULL DEFAULT 'approved',
        "createdBy"   UUID,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_templates_tenant_name" ON "templates" ("tenantId", "name")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_templates_tenant_status" ON "templates" ("tenantId", "status")`
    );

    // ── campaigns modifications ────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD COLUMN "templateId" UUID,
      ADD COLUMN "templateParams" JSONB
    `);

    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD CONSTRAINT "FK_campaigns_template"
      FOREIGN KEY ("templateId") REFERENCES "templates"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_campaigns_template"`);
    await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "templateParams"`);
    await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "templateId"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_templates_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_templates_tenant_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "templates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "template_status_enum"`);
  }
}
