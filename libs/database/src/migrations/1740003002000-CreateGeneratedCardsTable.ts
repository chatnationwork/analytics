import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGeneratedCardsTable1740003002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE generated_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        template_id VARCHAR(100),
        input_data JSONB DEFAULT '{}',
        output_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_generated_cards_org ON generated_cards(organization_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS generated_cards;`);
  }
}
