import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResolutionFormData1769521100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resolutions" ADD COLUMN IF NOT EXISTS "formData" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resolutions" DROP COLUMN IF EXISTS "formData"`,
    );
  }
}
