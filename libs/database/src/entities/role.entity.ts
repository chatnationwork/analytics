import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
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

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
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
  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
