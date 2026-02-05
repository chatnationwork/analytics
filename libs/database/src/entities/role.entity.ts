import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum Permission {
  // Global Permissions
  ANALYTICS_VIEW = "analytics.view",
  ANALYTICS_EXPORT = "analytics.export",
  SETTINGS_MANAGE = "settings.manage",
  USERS_MANAGE = "users.manage",
  TEAMS_MANAGE = "teams.manage",
  /** View active chats, queued chats, and agent workload across all teams (admins). */
  TEAMS_VIEW_ALL = "teams.view_all",
  /** View active chats, queued chats, and agent workload only for teams the user is a member of (team managers). */
  TEAMS_VIEW_TEAM = "teams.view_team",
  AUDIT_VIEW = "audit.view",

  // Team Permissions (Scoped)
  TEAM_SETTINGS = "team.settings",
  TEAM_ANALYTICS = "team.analytics",
  SESSION_VIEW = "session.view",
  SESSION_MANAGE = "session.manage",
  AGENT_ASSIGN = "agent.assign",
  /** Super admins: view all chats (assigned and unassigned) in the inbox */
  SESSION_VIEW_ALL = "session.view_all",
  /** Configure password complexity for the organization (Settings → Security). Super admins only. */
  SETTINGS_PASSWORD_COMPLEXITY = "settings.password_complexity",
  /** Enable or disable "Require 2FA for organization". When enabled, all users must set up 2FA. Super admins only. */
  SETTINGS_TWO_FACTOR = "settings.two_factor",

  // Contact permissions (Contacts page / WhatsApp analytics contacts)
  /** View contact list and export. */
  CONTACTS_VIEW = "contacts.view",
  /** Create contacts (e.g. import). Admins only by default. */
  CONTACTS_CREATE = "contacts.create",
  /** Update contact details. All users by default. */
  CONTACTS_UPDATE = "contacts.update",
  /** Deactivate a contact (soft disable). Admins only by default. */
  CONTACTS_DEACTIVATE = "contacts.deactivate",
}

@Entity("roles")
export class RoleEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  /** Null for system roles, set for tenant custom roles */
  @Column({ nullable: true })
  tenantId: string;

  @Column({ default: false })
  isSystem: boolean;

  /** List of permission strings */
  @Column({ type: "jsonb", default: [] })
  permissions: string[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
