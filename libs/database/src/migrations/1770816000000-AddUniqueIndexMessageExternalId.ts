import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueIndexMessageExternalId1770816000000
  implements MigrationInterface
{
  name = "AddUniqueIndexMessageExternalId1770816000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove existing duplicate messages first (keep the earliest one per tenantId+externalId).
    await queryRunner.query(`
      DELETE FROM "messages"
      WHERE "id" IN (
        SELECT "id" FROM (
          SELECT "id",
                 ROW_NUMBER() OVER (
                   PARTITION BY "tenantId", "externalId"
                   ORDER BY "createdAt" ASC
                 ) AS rn
          FROM "messages"
          WHERE "externalId" IS NOT NULL
        ) sub
        WHERE sub.rn > 1
      )
    `);

    // Partial unique index: only enforce uniqueness when externalId is not null
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_messages_tenant_externalId"
      ON "messages" ("tenantId", "externalId")
      WHERE "externalId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_messages_tenant_externalId"`,
    );
  }
}
