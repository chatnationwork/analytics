import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateImportMappingTemplates1770900300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "import_mapping_templates" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" VARCHAR(50) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "mapping" JSONB NOT NULL,
        "createdBy" VARCHAR(50),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_import_mapping_templates_tenant_name" ON "import_mapping_templates" ("tenantId", "name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_import_mapping_templates_tenant_name"`);
    await queryRunner.query(`DROP TABLE "import_mapping_templates"`);
  }
}
