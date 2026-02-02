import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactsTable1769521400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("contacts");
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "contacts" (
          "tenantId" character varying(50) NOT NULL,
          "contactId" character varying(100) NOT NULL,
          "name" character varying(200),
          "firstSeen" TIMESTAMP WITH TIME ZONE NOT NULL,
          "lastSeen" TIMESTAMP WITH TIME ZONE NOT NULL,
          "messageCount" integer NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_contacts_tenant_contact" PRIMARY KEY ("tenantId", "contactId")
        )
      `);
    }
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contacts_tenant_lastSeen" ON "contacts" ("tenantId", "lastSeen")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contacts"`);
  }
}
