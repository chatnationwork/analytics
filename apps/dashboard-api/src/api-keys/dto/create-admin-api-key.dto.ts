/**
 * =============================================================================
 * CREATE ADMIN API KEY DTO
 * =============================================================================
 *
 * Validation DTO for the admin API key generation endpoint.
 * Unlike the user-facing DTO, this does not require tenantId since
 * the system auto-resolves the single tenant from the database.
 */

import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class CreateAdminApiKeyDto {
  /** Human-readable name for the key (e.g. "Production SDK") */
  @IsString()
  @IsNotEmpty()
  name: string;

  /** Key type: 'write' for SDK event tracking, 'read' for API access */
  @IsOptional()
  @IsEnum(['write', 'read'])
  type?: 'write' | 'read';

  /** Optional project UUID to scope the key to a specific project */
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
