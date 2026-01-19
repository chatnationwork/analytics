/**
 * =============================================================================
 * INVITATION ENTITY
 * =============================================================================
 * 
 * Represents a pending invitation for a user to join a tenant.
 * 
 * TABLE: invitations
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';
import { MembershipRole } from './tenant-membership.entity';

export type InvitationStatus = 'pending' | 'accepted' | 'expired';

@Entity('invitations')
export class InvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Email of the person being invited */
  @Column()
  @Index()
  email: string;

  /** The tenant they are being invited to */
  @Column('uuid')
  tenantId: string;

  /** Role they will be assigned */
  @Column({ type: 'varchar', default: 'member' })
  role: MembershipRole;

  /** Unique secure token for the invitation link */
  @Column({ unique: true })
  @Index()
  token: string;

  /** Status of the invitation */
  @Column({ default: 'pending' })
  status: InvitationStatus;

  /** When the invitation expires */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /** Who created the invitation */
  @Column('uuid')
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  inviter: UserEntity;
}
