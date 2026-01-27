import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentSystem1769509219191 implements MigrationInterface {
    name = 'AddAgentSystem1769509219191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."agent_profiles_status_enum" AS ENUM('online', 'offline', 'busy')`);
        await queryRunner.query(`CREATE TABLE "agent_profiles" ("userId" uuid NOT NULL, "status" "public"."agent_profiles_status_enum" NOT NULL DEFAULT 'offline', "maxConcurrentChats" integer NOT NULL DEFAULT '3', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b33e9dd5843a6c76a1123463bc1" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TYPE "public"."team_members_role_enum" AS ENUM('member', 'leader', 'manager')`);
        await queryRunner.query(`CREATE TABLE "team_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."team_members_role_enum" NOT NULL DEFAULT 'member', "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b2f17b533905e0a94390c5e220" ON "team_members" ("teamId", "userId") `);
        await queryRunner.query(`CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "routingStrategy" character varying NOT NULL DEFAULT 'round_robin', "tenantId" character varying(50) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."inbox_sessions_status_enum" AS ENUM('unassigned', 'assigned', 'resolved')`);
        await queryRunner.query(`CREATE TABLE "inbox_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" character varying(50) NOT NULL, "contactId" character varying(100) NOT NULL, "contactName" character varying(100), "status" "public"."inbox_sessions_status_enum" NOT NULL DEFAULT 'unassigned', "channel" character varying NOT NULL DEFAULT 'whatsapp', "assignedAgentId" uuid, "assignedTeamId" uuid, "priority" integer NOT NULL DEFAULT '0', "context" jsonb, "lastMessageAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d46d983e2f1365acab932a0c490" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7e3e0f8402dd8d03c161f9fba2" ON "inbox_sessions" ("assignedAgentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_1548f75997ae68014da7fbb007" ON "inbox_sessions" ("tenantId", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."messages_direction_enum" AS ENUM('inbound', 'outbound')`);
        await queryRunner.query(`CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image', 'video', 'audio', 'document')`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "tenantId" character varying(50) NOT NULL, "externalId" character varying, "direction" "public"."messages_direction_enum" NOT NULL, "type" "public"."messages_type_enum" NOT NULL DEFAULT 'text', "content" text, "metadata" jsonb, "senderId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_399833392126349ef0b04b9bed" ON "messages" ("sessionId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "resolutions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "category" character varying(100) NOT NULL, "notes" text, "outcome" character varying(50) NOT NULL DEFAULT 'resolved', "resolvedByAgentId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "csatScore" integer, "csatFeedback" text, CONSTRAINT "REL_d02540fa6ebd8b302ae8ddb727" UNIQUE ("sessionId"), CONSTRAINT "PK_e30e6dd3e4cc52a23555b4b1a4a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "shifts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teamId" uuid, "userId" uuid NOT NULL, "startTime" TIMESTAMP WITH TIME ZONE NOT NULL, "endTime" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_84d692e367e4d6cdf045828768c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9115813eb884ccd87805e25b8d" ON "shifts" ("teamId", "startTime", "endTime") `);
        await queryRunner.query(`CREATE TABLE "assignment_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" character varying(50) NOT NULL, "teamId" character varying(100), "enabled" boolean NOT NULL DEFAULT true, "strategy" character varying NOT NULL DEFAULT 'round_robin', "settings" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_68aa10e3148314ef5bcc6c313bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "agent_profiles" ADD CONSTRAINT "FK_b33e9dd5843a6c76a1123463bc1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_6d1c8c7f705803f0711336a5c33" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_0a72b849753a046462b4c5a8ec2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inbox_sessions" ADD CONSTRAINT "FK_7e3e0f8402dd8d03c161f9fba2a" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inbox_sessions" ADD CONSTRAINT "FK_9c0efbfc292f584e4fe21f7573a" FOREIGN KEY ("assignedTeamId") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_066163c46cda7e8187f96bc87a0" FOREIGN KEY ("sessionId") REFERENCES "inbox_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resolutions" ADD CONSTRAINT "FK_d02540fa6ebd8b302ae8ddb727f" FOREIGN KEY ("sessionId") REFERENCES "inbox_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shifts" ADD CONSTRAINT "FK_2b5e8dff9c444f82893ff03ebbf" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shifts" ADD CONSTRAINT "FK_7862b9a401e0fe7dc5ef96e9116" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "FK_7862b9a401e0fe7dc5ef96e9116"`);
        await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "FK_2b5e8dff9c444f82893ff03ebbf"`);
        await queryRunner.query(`ALTER TABLE "resolutions" DROP CONSTRAINT "FK_d02540fa6ebd8b302ae8ddb727f"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_066163c46cda7e8187f96bc87a0"`);
        await queryRunner.query(`ALTER TABLE "inbox_sessions" DROP CONSTRAINT "FK_9c0efbfc292f584e4fe21f7573a"`);
        await queryRunner.query(`ALTER TABLE "inbox_sessions" DROP CONSTRAINT "FK_7e3e0f8402dd8d03c161f9fba2a"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_0a72b849753a046462b4c5a8ec2"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_6d1c8c7f705803f0711336a5c33"`);
        await queryRunner.query(`ALTER TABLE "agent_profiles" DROP CONSTRAINT "FK_b33e9dd5843a6c76a1123463bc1"`);
        await queryRunner.query(`DROP TABLE "assignment_configs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9115813eb884ccd87805e25b8d"`);
        await queryRunner.query(`DROP TABLE "shifts"`);
        await queryRunner.query(`DROP TABLE "resolutions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_399833392126349ef0b04b9bed"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TYPE "public"."messages_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."messages_direction_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1548f75997ae68014da7fbb007"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e3e0f8402dd8d03c161f9fba2"`);
        await queryRunner.query(`DROP TABLE "inbox_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."inbox_sessions_status_enum"`);
        await queryRunner.query(`DROP TABLE "teams"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2f17b533905e0a94390c5e220"`);
        await queryRunner.query(`DROP TABLE "team_members"`);
        await queryRunner.query(`DROP TYPE "public"."team_members_role_enum"`);
        await queryRunner.query(`DROP TABLE "agent_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."agent_profiles_status_enum"`);
    }

}
