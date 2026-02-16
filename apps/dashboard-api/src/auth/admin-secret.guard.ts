/**
 * =============================================================================
 * ADMIN SECRET GUARD
 * =============================================================================
 *
 * NestJS guard that validates requests against the ADMIN_API_SECRET env var.
 * Used to protect developer-only admin endpoints (e.g. API key management).
 * The secret must be passed as a Bearer token in the Authorization header.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AdminSecretGuard implements CanActivate {
  private readonly logger = new Logger(AdminSecretGuard.name);
  private readonly adminSecret: string;

  constructor() {
    const secret = process.env.ADMIN_API_SECRET;
    if (!secret) {
      throw new Error('ADMIN_API_SECRET environment variable is not set');
    }
    this.adminSecret = secret;
  }

  /**
   * Validates the Authorization header against the admin secret.
   * Expects format: "Authorization: Bearer <ADMIN_API_SECRET>"
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Invalid authorization format. Expected: Bearer <secret>',
      );
    }

    if (token !== this.adminSecret) {
      this.logger.warn('Admin secret validation failed');
      throw new UnauthorizedException('Invalid admin secret');
    }

    return true;
  }
}
