import { Injectable, Logger } from '@nestjs/common';
import { IProjectService, Project } from '@lib/common';
import { ApiKeyRepository } from '@lib/database';
import * as crypto from 'crypto';

@Injectable()
export class ProjectService implements IProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async findByWriteKey(writeKey: string): Promise<Project | null> {
    try {
      // Hash the incoming key to match stored hash
      const hash = crypto.createHash('sha256').update(writeKey).digest('hex');
      
      const apiKey = await this.apiKeyRepository.findByHash(hash);

      if (!apiKey) {
        return null; // Key not found
      }

      if (!apiKey.isActive) {
        this.logger.warn(`Inactive API key used: ${apiKey.id}`);
        return null;
      }

      if (apiKey.type !== 'write') {
        this.logger.warn(`Invalid key type used for capture: ${apiKey.type} (expected 'write')`);
        return null;
      }

      // Update usage stats asynchronously
      this.apiKeyRepository.updateLastUsed(apiKey.id).catch((err) => {
        this.logger.error(`Failed to update last used for key ${apiKey.id}: ${err.message}`);
      });

      return {
        projectId: apiKey.projectId || 'default',
        tenantId: apiKey.tenantId,
        writeKey,
        allowedOrigins: ['*'], // Default to all origins for now. Can be extended to DB later.
      };
    } catch (error) {
      this.logger.error(`Error validating write key: ${error.message}`);
      return null;
    }
  }
}
