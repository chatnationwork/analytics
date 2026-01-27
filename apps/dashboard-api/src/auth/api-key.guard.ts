
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Extract Key from Header (x-api-key) or Query (apiKey)
    const apiKey = request.headers['x-api-key'] as string || request.query['apiKey'] as string;

    if (!apiKey) {
      return false; // Validates as false (AuthGuard approach often throws, but simple boolean is fine to pass to next guard if using composite)
      // Actually, if we use it alone, we should probably throw or return false.
      // If we combine with JWT, we handle it differently.
    }

    // 2. Validate
    const validation = await this.apiKeysService.validateKey(apiKey);

    if (!validation) {
      throw new UnauthorizedException('Invalid API Key');
    }

    // 3. Attach Context to Request (mimic JWT user structure)
    // We attach it to a specific 'apiKey' property or 'user' dummy?
    // For handover, we need 'tenantId'.
    request.user = {
      tenantId: validation.tenantId,
      id: 'system-api-key',
      email: 'system@apikey',
      projectId: validation.projectId,
      isApiKey: true
    };

    return true;
  }
}
