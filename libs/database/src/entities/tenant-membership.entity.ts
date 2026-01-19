/**
 * =============================================================================
 * TENANT MEMBERSHIP ENTITY
 * =============================================================================
 * 
 * Junction table linking users to tenants with role assignments.
 * 
 * TABLE: tenant_memberships
 * 
 * ROLES:
 * -----
 * - owner: Full access, can delete tenant, manage billing
 * - admin: Can manage members, settings, projects
 * - member: Can view analytics, create funnels
 * 
 * A user can belong to multiple tenants with different roles.
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TenantEntity } from './tenant.entity';

/** Available membership roles */
export type MembershipRole = 'owner' | 'admin' | 'member';

@Entity('tenant_memberships')
@Index(['tenantId', 'userId'], { unique: true })
export class TenantMembershipEntity {
  /** User ID (composite primary key part 1) */
  @PrimaryColumn('uuid')
  userId: string;

  /** Tenant ID (composite primary key part 2) */
  @PrimaryColumn('uuid')
  tenantId: string;

  /** User's role within this tenant */
  @Column({ default: 'member' })
  role: MembershipRole;

  /** When the membership was created */
  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;

  /** Who invited this member (null if owner/founder) */
  @Column('uuid', { nullable: true })
  invitedBy: string | null;

  // Relations

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;
}
