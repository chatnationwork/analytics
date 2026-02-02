/**
 * =============================================================================
 * CRM INTEGRATION DTOs
 * =============================================================================
 *
 * Data Transfer Objects for CRM integration CRUD operations.
 */

import {
  IsString,
  IsUrl,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from "class-validator";

/** Create a new CRM integration */
export class CreateCrmIntegrationDto {
  /** Human-readable name (e.g., "Production WhatsApp") */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  /** CRM API base URL */
  @IsUrl({ require_tld: false }, { message: "Please provide a valid API URL" })
  apiUrl: string;

  /** CRM API key (will be encrypted) */
  @IsString()
  @MinLength(10, { message: "API key seems too short" })
  apiKey: string;

  /** Link to this CRM's webview base pages (for sending users to webview) */
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: "Must be a valid URL" })
  @MaxLength(500)
  webLink?: string;

  /** CSAT survey link sent to user when chat is resolved. If not set, uses webLink + '/csat'. */
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: "Must be a valid URL" })
  @MaxLength(500)
  csatLink?: string;

  /** Provider-specific config (e.g. WhatsApp IDs) */
  @IsOptional()
  config?: Record<string, any>;
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
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  webLink?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  csatLink?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  config?: Record<string, any>;
}

/** Response DTO (never exposes API key) */
export class CrmIntegrationResponseDto {
  id: string;
  name: string;
  apiUrl: string;
  webLink: string | null;
  csatLink: string | null;
  isActive: boolean;
  config: Record<string, any> | null;
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
