import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketTypeMetadata1771547105787 implements MigrationInterface {
  name = "AddTicketTypeMetadata1771547105787";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_ticket_types" ADD "metadata" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_ticket_types" DROP COLUMN "metadata"`,
    );
  }
}
