import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create entity_archive table for Danger Zone: stores JSON snapshot before delete.
 */
export class AddEntityArchiveTable1769523400000 implements MigrationInterface {
  name = "AddEntityArchiveTable1769523400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "entity_archive" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entityType" varchar(20) NOT NULL,
        "entityId" uuid NOT NULL,
        "tenantId" uuid,
        "archivedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archivedBy" uuid NOT NULL,
        "data" jsonb NOT NULL,
        CONSTRAINT "PK_entity_archive" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_entity_archive_type_id" ON "entity_archive" ("entityType", "entityId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_entity_archive_tenant_archived" ON "entity_archive" ("tenantId", "archivedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_entity_archive_tenant_archived"`);
    await queryRunner.query(`DROP INDEX "IDX_entity_archive_type_id"`);
    await queryRunner.query(`DROP TABLE "entity_archive"`);
  }
}
