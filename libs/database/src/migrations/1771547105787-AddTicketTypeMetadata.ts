import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketTypeMetadata1771547105787 implements MigrationInterface {
    name = 'AddTicketTypeMetadata1771547105787'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" character varying NOT NULL, "identity_id" uuid, "contact_id" uuid, "payable_type" character varying(50) NOT NULL, "payable_id" character varying NOT NULL, "amount" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'KES', "exchange_rate" numeric(10,6), "amount_kes" numeric(12,2), "payment_method" character varying(30) NOT NULL DEFAULT 'mpesa', "phone_number" character varying(20), "checkout_request_id" character varying(100), "merchant_request_id" character varying(100), "mpesa_receipt_number" character varying(50), "status" character varying(20) NOT NULL DEFAULT 'pending', "failure_reason" text, "provider_metadata" jsonb, "initiated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c7c2dd38e3a009bd610296982ae" UNIQUE ("checkout_request_id"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c7c2dd38e3a009bd610296982a" ON "payments" ("checkout_request_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_9ae7192a0f07be41925ee7aba9" ON "payments" ("payable_type", "payable_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9fc4f431ce0aca3aa0587a7839" ON "payments" ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fc07ace491143726974991711f" ON "payments" ("organization_id") `);
        await queryRunner.query(`ALTER TABLE "eos_ticket_types" ADD "metadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_7c9ad8bbf427a5207c0af3723b1" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_9fc4f431ce0aca3aa0587a7839a" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_9fc4f431ce0aca3aa0587a7839a"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_7c9ad8bbf427a5207c0af3723b1"`);
        await queryRunner.query(`ALTER TABLE "eos_ticket_types" DROP COLUMN "metadata"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc07ace491143726974991711f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fc4f431ce0aca3aa0587a7839"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ae7192a0f07be41925ee7aba9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7c2dd38e3a009bd610296982a"`);
        await queryRunner.query(`DROP TABLE "payments"`);
    }

}
