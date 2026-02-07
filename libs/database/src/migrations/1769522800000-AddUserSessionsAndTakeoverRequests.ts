import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSessionsAndTakeoverRequests1769522800000 implements MigrationInterface {
  name = "AddUserSessionsAndTakeoverRequests1769522800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sessionsExists = await queryRunner.hasTable("user_sessions");
    if (!sessionsExists) {
      await queryRunner.query(`
        CREATE TABLE "user_sessions" (
          "userId" uuid NOT NULL,
          "sessionId" uuid NOT NULL,
          "updatedAt" timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "PK_user_sessions_userId" PRIMARY KEY ("userId"),
          CONSTRAINT "FK_user_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);
    }

    const takeoverExists = await queryRunner.hasTable(
      "session_takeover_requests",
    );
    if (!takeoverExists) {
      await queryRunner.query(`
        CREATE TABLE "session_takeover_requests" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "userId" uuid NOT NULL,
          "method" varchar(10) NOT NULL,
          "code" varchar(10) NULL,
          "emailTokenHash" varchar(64) NULL,
          "expiresAt" timestamptz NOT NULL,
          CONSTRAINT "PK_session_takeover_requests_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_session_takeover_requests_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_session_takeover_requests_expiresAt" ON "session_takeover_requests" ("expiresAt")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "session_takeover_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions"`);
  }
}
