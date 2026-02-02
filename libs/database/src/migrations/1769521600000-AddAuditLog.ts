import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLog1769521600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("audit_log");
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "audit_log" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "tenantId" character varying(50) NOT NULL,
          "actorId" character varying(36),
          "actorType" character varying(20) NOT NULL,
          "action" character varying(100) NOT NULL,
          "resourceType" character varying(50),
          "resourceId" character varying(100),
          "details" jsonb,
          "ip" character varying(45),
          "userAgent" text,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(
        `CREATE INDEX "IDX_audit_log_tenant_created" ON "audit_log" ("tenantId", "createdAt")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_audit_log_tenant_action" ON "audit_log" ("tenantId", "action")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_audit_log_actor_created" ON "audit_log" ("actorId", "createdAt")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
  }
}
