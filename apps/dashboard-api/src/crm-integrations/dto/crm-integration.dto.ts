/**
 * =============================================================================
 * CRM INTEGRATION DTOs
 * =============================================================================
 * 
 * Data Transfer Objects for CRM integration CRUD operations.
 */

import { IsString, IsUrl, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';

/** Create a new CRM integration */
export class CreateCrmIntegrationDto {
  /** Human-readable name (e.g., "Production WhatsApp") */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  /** CRM API base URL */
  @IsUrl({ require_tld: false }, { message: 'Please provide a valid API URL' })
  apiUrl: string;

  /** CRM API key (will be encrypted) */
  @IsString()
  @MinLength(10, { message: 'API key seems too short' })
  apiKey: string;
}

/** Update an existing CRM integration */
export class UpdateCrmIntegrationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  apiUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Response DTO (never exposes API key) */
export class CrmIntegrationResponseDto {
  id: string;
  name: string;
  apiUrl: string;
  isActive: boolean;
  lastConnectedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

/** Connection test result */
export class TestConnectionResponseDto {
  success: boolean;
  message: string;
  contactCount?: number;
}
