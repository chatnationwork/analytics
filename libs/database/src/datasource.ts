import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { expand } from "dotenv-expand";
import {
  UserEntity,
  EventEntity,
  SessionEntity,
  IdentityEntity,
  ProjectEntity,
  TenantEntity,
  TenantMembershipEntity,
  CrmIntegrationEntity,
  ApiKeyEntity,
  InvitationEntity,
  AgentProfileEntity,
  TeamEntity,
  TeamMemberEntity,
  InboxSessionEntity,
  MessageEntity,
  ResolutionEntity,
  ShiftEntity,
  AssignmentConfigEntity,
  RolePermissionEntity,
  RoleEntity,
  ContactEntity,
} from "./entities";

// Load environment variables
const env = dotenv.config({ path: ".env" });
expand(env);

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "analytics",
  entities: [
    UserEntity,
    EventEntity,
    SessionEntity,
    IdentityEntity,
    ProjectEntity,
    TenantEntity,
    TenantMembershipEntity,
    CrmIntegrationEntity,
    ApiKeyEntity,
    InvitationEntity,
    AgentProfileEntity,
    TeamEntity,
    TeamMemberEntity,
    InboxSessionEntity,
    MessageEntity,
    ResolutionEntity,
    ShiftEntity,
    AssignmentConfigEntity,
    RolePermissionEntity,
    RoleEntity,
    ContactEntity,
  ],
  migrations: ["libs/database/src/migrations/*.ts"],
  synchronize: false,
});
