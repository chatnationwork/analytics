
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeysService } from '../api-keys/api-keys.service';

/**
 * Guard that accepts EITHER a valid JWT (Bearer) OR a valid API Key (x-api-key)
 */
@Injectable()
export class HandoverAuthGuard extends JwtAuthGuard {
  constructor(private readonly apiKeysService: ApiKeysService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Check Header first, then Query Param - bypasses Proxy/Nginx stripping headers
    const apiKey = (request.headers['x-api-key'] as string) || (request.query['apiKey'] as string);

    // 1. Check API Key first
    if (apiKey) {
      const validation = await this.apiKeysService.validateKey(apiKey);
      if (validation) {
        // Mock a user object for the controller to use
        request.user = {
          tenantId: validation.tenantId,
          id: 'system-api-key', // Placeholder ID
          email: 'system@apikey',
          isApiKey: true,
          projectId: validation.projectId
        };
        return true;
      }
      // If key provided but invalid, we could throw or fall back. 
      // Usually if they try to use a key and fail, we should probably fail.
      // But let's allow fallback to JWT just in case they sent a bad key but good token?
      // No, simpler to fail if key is bad.
      throw new UnauthorizedException('Invalid API Key');
    }

    // 2. Fallback to JWT
    try {
        return await (super.canActivate(context) as Promise<boolean>);
    } catch (e) {
        throw new UnauthorizedException('Authentication required: Provide "Authorization: Bearer <jwt>" or "x-api-key" header');
    }
  }
}
