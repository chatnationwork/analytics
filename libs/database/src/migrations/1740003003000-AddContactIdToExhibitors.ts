import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactIdToExhibitors1740003003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD "contact_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" ADD CONSTRAINT "FK_eos_exhibitors_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP CONSTRAINT "FK_eos_exhibitors_contact"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_exhibitors" DROP COLUMN "contact_id"`,
    );
  }
}
