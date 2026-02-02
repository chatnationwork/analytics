import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCrmIntegrationCsatLink1769521300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "crm_integrations" ADD COLUMN IF NOT EXISTS "csatLink" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "crm_integrations" DROP COLUMN IF EXISTS "csatLink"`,
    );
  }
}
