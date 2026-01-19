/**
 * =============================================================================
 * USER REPOSITORY
 * =============================================================================
 * 
 * Data access layer for user management.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  /** Find user by email (for login) */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  /** Find user by ID */
  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Create a new user */
  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const entity = this.repo.create({
      ...data,
      email: data.email?.toLowerCase(),
    });
    return this.repo.save(entity);
  }

  /** Update user */
  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  /** Update last login time */
  async updateLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { lastLoginAt: new Date() });
  }

  /** Check if email exists */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.repo.count({ where: { email: email.toLowerCase() } });
    return count > 0;
  }
}
