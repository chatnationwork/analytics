/**
 * =============================================================================
 * WRITE KEY GUARD
 * =============================================================================
 * 
 * Authentication guard for the Collector API.
 * Validates that incoming requests have a valid write key.
 * 
 * WHAT IS A WRITE KEY?
 * -------------------
 * A write key is like a password for your analytics project.
 * It's included with every event to identify which project the data belongs to.
 * 
 * Unlike API keys, write keys are meant to be "public" (visible in frontend code)
 * but they're still validated to:
 * - Associate events with the correct project
 * - Validate allowed origins (prevent data injection from other sites)
 * - Enable/disable tracking per project
 * 
 * GUARD IMPLEMENTATION:
 * --------------------
 * 1. Extract write key from header (X-Write-Key) or body (write_key)
 * 2. Look up project in database (or mock service for MVP)
 * 3. Validate that the request origin is allowed
 * 4. Attach project info to request for later use
 * 5. Return true (allow) or throw UnauthorizedException (deny)
 * 
 * OOP PRINCIPLES:
 * --------------
 * - Interface: IProjectService defines the contract for project lookup
 * - Dependency Injection: Guard doesn't know about database directly
 * - Single Responsibility: Only handles authentication
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * Shape of a project object.
 * Used by guards and decorators to pass project info.
 */
export interface Project {
  /** Unique project identifier */
  projectId: string;
  /** Tenant (organization) this project belongs to */
  tenantId: string;
  /** The write key used for authentication */
  writeKey: string;
  /** List of allowed origins (domains) for CORS */
  allowedOrigins: string[];
}

/**
 * Interface for the project lookup service.
 * 
 * DEPENDENCY INJECTION WITH INTERFACES:
 * ------------------------------------
 * By depending on an interface instead of a concrete class,
 * we can easily swap implementations:
 * - MockProjectService for development/testing
 * - ProjectRepository for production (database lookup)
 */
export interface IProjectService {
  /**
   * Find a project by its write key.
   * @param writeKey - The write key to look up
   * @returns Project if found, null otherwise
   */
  findByWriteKey(writeKey: string): Promise<Project | null>;
}

/**
 * Injection token for the project service.
 * 
 * WHAT IS AN INJECTION TOKEN?
 * --------------------------
 * NestJS uses tokens to identify what to inject.
 * For classes, the class itself is the token.
 * For interfaces (which don't exist at runtime), we use a string token.
 * 
 * In the module:
 *   { provide: PROJECT_SERVICE, useClass: ProjectRepository }
 * 
 * In the guard:
 *   @Inject(PROJECT_SERVICE) private projectService: IProjectService
 */
export const PROJECT_SERVICE = 'PROJECT_SERVICE';

/**
 * Guard that validates write keys for the Collector API.
 * 
 * @Injectable() is required because this guard uses dependency injection.
 * Guards without dependencies don't need @Injectable().
 */
@Injectable()
export class WriteKeyGuard implements CanActivate {
  /**
   * Constructor with project service injection.
   * 
   * @Inject(PROJECT_SERVICE) - Tells NestJS to look up this token
   * and inject the registered provider.
   * 
   * @param projectService - Service for looking up projects by write key
   */
  constructor(
    @Inject(PROJECT_SERVICE)
    private readonly projectService: IProjectService,
  ) {}

  /**
   * The main guard method.
   * 
   * CANACTIVATE INTERFACE:
   * ---------------------
   * All guards must implement CanActivate with the canActivate() method.
   * This method returns:
   * - true: Request is allowed to proceed
   * - false: Request is denied (403 Forbidden)
   * - throw: Custom error (e.g., UnauthorizedException for 401)
   * 
   * @param context - Provides access to the request and other context
   * @returns true if request is authenticated, throws otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the HTTP request from the execution context
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Step 1: Extract write key from header or body
    const writeKey = this.extractWriteKey(request);
    if (!writeKey) {
      throw new UnauthorizedException('Missing X-Write-Key header');
    }

    // Step 2: Look up the project
    const project = await this.projectService.findByWriteKey(writeKey);
    if (!project) {
      throw new UnauthorizedException('Invalid write key');
    }

    // Step 3: Validate origin (CORS check)
    const origin = request.headers['origin'] as string;
    if (origin && project.allowedOrigins.length > 0) {
      const isAllowed = project.allowedOrigins.some(
        (allowed) => allowed === '*' || allowed === origin,
      );
      if (!isAllowed) {
        throw new UnauthorizedException('Origin not allowed');
      }
    }

    // Step 4: Attach project to request for use in controllers
    // We use (request as any) because Fastify's type doesn't include 'project'
    (request as any).project = project;

    // Step 5: Allow the request
    return true;
  }

  /**
   * Extract write key from request.
   * 
   * Looks in two places:
   * 1. X-Write-Key header (preferred)
   * 2. write_key field in request body
   * 
   * @param request - The Fastify request
   * @returns Write key string or null
   */
  private extractWriteKey(request: FastifyRequest): string | null {
    // Check header first (standard location)
    const headerKey = request.headers['x-write-key'] as string;
    if (headerKey) return headerKey;

    // Fallback: Check request body
    const body = request.body as any;
    if (body?.write_key) return body.write_key;

    return null;
  }
}
