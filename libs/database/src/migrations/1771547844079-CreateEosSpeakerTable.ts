import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEosSpeakerTable1771547844079 implements MigrationInterface {
  name = "CreateEosSpeakerTable1771547844079";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "eos_speakers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "organization_id" character varying, "name" character varying(255) NOT NULL, "bio" text, "headshot_url" text, "talk_title" character varying(255), "session_time" TIMESTAMP WITH TIME ZONE, "contact_id" uuid, "invitation_token" character varying(255), "invited_at" TIMESTAMP WITH TIME ZONE, "status" character varying(20) NOT NULL DEFAULT 'pending', "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_41c09876d02113ecba6435c8d41" UNIQUE ("invitation_token"), CONSTRAINT "PK_9c76b9d17b6f1b8cb2bf19210d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_speakers" ADD CONSTRAINT "FK_7e4e2942c1cc4d68ab519697b14" FOREIGN KEY ("event_id") REFERENCES "eos_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_speakers" ADD CONSTRAINT "FK_b28a3cd7b052b2c7d303e39189b" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eos_speakers" DROP CONSTRAINT "FK_b28a3cd7b052b2c7d303e39189b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eos_speakers" DROP CONSTRAINT "FK_7e4e2942c1cc4d68ab519697b14"`,
    );
    await queryRunner.query(`DROP TABLE "eos_speakers"`);
  }
}
