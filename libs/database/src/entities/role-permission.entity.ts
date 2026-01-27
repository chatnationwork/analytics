import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum Permission {
  // Global Permissions
  ANALYTICS_VIEW = 'analytics.view',
  ANALYTICS_EXPORT = 'analytics.export',
  SETTINGS_MANAGE = 'settings.manage',
  USERS_MANAGE = 'users.manage',
  TEAMS_MANAGE = 'teams.manage',
  AUDIT_VIEW = 'audit.view',

  // Team Permissions (Scoped)
  TEAM_SETTINGS = 'team.settings',
  TEAM_ANALYTICS = 'team.analytics',
  SESSION_VIEW = 'session.view',
  SESSION_MANAGE = 'session.manage',
  AGENT_ASSIGN = 'agent.assign',
}

@Entity('role_permissions')
@Index(['role', 'permission'], { unique: true })
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The role this permission applies to.
   * Based on TeamRole enum but stored as string to allow future custom roles.
   */
  @Column()
  role: string;

  /**
   * The specific permission granted.
   */
  @Column({
    type: 'enum',
    enum: Permission,
  })
  permission: Permission;

  @Column({ nullable: true })
  tenantId: string; // Optional: If permission is specific to a tenant customization

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
