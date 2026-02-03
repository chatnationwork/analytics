import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactYearOfBirth1769522100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "yearOfBirth" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "yearOfBirth"`,
    );
  }
}
