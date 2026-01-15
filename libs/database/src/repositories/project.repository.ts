/**
 * =============================================================================
 * PROJECT REPOSITORY
 * =============================================================================
 * 
 * Data access layer for projects.
 * 
 * IMPLEMENTS: IProjectService
 * --------------------------
 * This repository implements the IProjectService interface from @lib/common.
 * This allows it to be used with the WriteKeyGuard for authentication.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../entities/project.entity';
import { IProjectService, Project } from '@lib/common';

/**
 * Repository for project management.
 * 
 * Implements IProjectService so it can be used for write key authentication.
 */
@Injectable()
export class ProjectRepository implements IProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: Repository<ProjectEntity>,
  ) {}

  /**
   * Find a project by its write key.
   * 
   * Used by WriteKeyGuard to authenticate SDK requests.
   * 
   * @param writeKey - The write key from the SDK
   * @returns Project interface if found, null otherwise
   */
  async findByWriteKey(writeKey: string): Promise<Project | null> {
    const entity = await this.repo.findOne({ where: { writeKey } });
    
    if (!entity) {
      return null;
    }

    // Map entity to the Project interface expected by guards
    return {
      projectId: entity.projectId,
      tenantId: entity.tenantId,
      writeKey: entity.writeKey,
      allowedOrigins: entity.allowedOrigins,
    };
  }

  /**
   * Find a project by ID.
   * 
   * @param projectId - The project UUID
   * @returns Full project entity if found
   */
  async findById(projectId: string): Promise<ProjectEntity | null> {
    return this.repo.findOne({ where: { projectId } });
  }

  /**
   * Create a new project.
   * 
   * @param project - Project data
   * @returns The created project
   */
  async create(project: Partial<ProjectEntity>): Promise<ProjectEntity> {
    const entity = this.repo.create(project);
    return this.repo.save(entity);
  }

  /**
   * List all projects for a tenant.
   * 
   * @param tenantId - The tenant UUID
   * @returns Array of projects
   */
  async findByTenantId(tenantId: string): Promise<ProjectEntity[]> {
    return this.repo.find({ where: { tenantId } });
  }
}
