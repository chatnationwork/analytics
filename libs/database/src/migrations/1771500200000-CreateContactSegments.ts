import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create contact_segments table for saved audience filter definitions.
 * Add optional segmentId column to campaigns for traceability.
 */
export class CreateContactSegments1771500200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contact_segments" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId"      VARCHAR(50) NOT NULL,
        "name"          VARCHAR(255) NOT NULL,
        "description"   TEXT,
        "filter"        JSONB NOT NULL,
        "contactCount"  INTEGER NOT NULL DEFAULT 0,
        "lastCountedAt" TIMESTAMPTZ,
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_contact_segments_tenantId" ON "contact_segments" ("tenantId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "segmentId" UUID`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "segmentId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_segments"`);
  }
}
