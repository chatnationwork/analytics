import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSchedulesTable1770900400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "schedule_status_enum" AS ENUM (
        'active',
        'paused',
        'completed',
        'failed',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "schedules" (
        "id"             UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId"       VARCHAR(50)       NOT NULL,
        "jobType"        VARCHAR(100)      NOT NULL,
        "jobPayload"     JSONB             NOT NULL,
        "cronExpression" VARCHAR(100),
        "scheduledAt"    TIMESTAMPTZ,
        "nextRunAt"      TIMESTAMPTZ       NOT NULL,
        "lastRunAt"      TIMESTAMPTZ,
        "status"         "schedule_status_enum" NOT NULL DEFAULT 'active',
        "maxRuns"        INTEGER,
        "runCount"       INTEGER           NOT NULL DEFAULT 0,
        "metadata"       JSONB,
        "createdBy"      VARCHAR(100),
        "createdAt"      TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedules" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_tenantId_status" ON "schedules" ("tenantId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_nextRunAt" ON "schedules" ("nextRunAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_jobType" ON "schedules" ("jobType")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_schedules_jobType"`);
    await queryRunner.query(`DROP INDEX "IDX_schedules_nextRunAt"`);
    await queryRunner.query(`DROP INDEX "IDX_schedules_tenantId_status"`);
    await queryRunner.query(`DROP TABLE "schedules"`);
    await queryRunner.query(`DROP TYPE "schedule_status_enum"`);
  }
}
