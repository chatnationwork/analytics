import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { Permission } from './role.entity';
export { Permission };

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
