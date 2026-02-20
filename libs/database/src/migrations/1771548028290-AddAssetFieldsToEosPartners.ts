import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssetFieldsToEosPartners1771548028290 implements MigrationInterface {
  name = "AddAssetFieldsToEosPartners1771548028290";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_speakers" ADD "presentation_url" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_speakers" DROP COLUMN "presentation_url"`,
    );
  }
}
