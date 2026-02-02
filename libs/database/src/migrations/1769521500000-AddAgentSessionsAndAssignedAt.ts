import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentSessionsAndAssignedAt1769521500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("agent_sessions");
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "agent_sessions" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "tenantId" character varying(50) NOT NULL,
          "agentId" uuid NOT NULL,
          "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "endedAt" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_agent_sessions" PRIMARY KEY ("id")
        )
      `);
    }
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_tenant_agent" ON "agent_sessions" ("tenantId", "agentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_tenant_started" ON "agent_sessions" ("tenantId", "startedAt")`,
    );

    await queryRunner.query(`
      ALTER TABLE "inbox_sessions" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inbox_sessions" DROP COLUMN IF EXISTS "assignedAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_sessions"`);
  }
}
